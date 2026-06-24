varying vec2 v_uv;
varying vec2 v_centered_uv;
varying float v_z;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform float u_left;
uniform float u_right;
uniform vec2 u_orient;

void main() {
    v_uv = uv;
    vec2 ratio = vec2(max(u_res.x / u_res.y, 1.0), max(u_res.y / u_res.x, 1.0));
    v_centered_uv = (uv - 0.5) * ratio;
	
	float punch = 0.7 + 0.3 * u_intensity * u_complexity * u_speed * u_peak;

    float t = u_time * 0.1;
    float z = 0.0;

    vec2 p = 7.0 * uv * punch; 
    z += sin(p.x * u_left * (0.7 + 0.3 * u_intensity) + t) * 0.3;
    z += cos(p.y * (0.3 + 0.7 * u_complexity) + u_time * 0.7) * 0.5;
    z += sin(p.x * u_right * (0.7 + 0.3 * u_speed) + p.y * (0.3 + 0.7 * u_peak) + t * 0.3);
	
	p.x *= pow(0.5 + 0.5 * u_speed + 3.0 * p.y, 2.0);
	p.y *= pow(0.7 + 0.3 * u_complexity + 5.0 * p.x, 3.0);
	z *= 1.0 - punch;
	p.xy *= pow(0.9 + 0.1 * (1.0 - u_intensity) + z, 2.0);
	
	vec2 offset = vec2(
		sin(t * u_intensity) + cos(u_time * u_complexity),
		cos(u_time * u_speed) + sin(t * u_peak)
	);
	
	vec2 centered = uv - 0.5 + offset * 20.0;
	float r = length(centered);
	float depth = 1.0 / (sqrt(r * r + 0.01)); 
	float mask = pow(1.0 - smoothstep(0.0, 0.5, r), 3.0);
    //z *= mask;

    v_z = z; 

	vec3 pos = vec3(
		position.xy,
		v_z + pow(depth, 3.0) * punch
	);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}