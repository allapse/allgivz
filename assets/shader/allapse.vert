varying vec2 v_uv;
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
	vec2 ratio = vec2(max(u_res.x / u_res.y, 1.0), max(u_res.y / u_res.x, 1.0));
    v_uv = uv;
	
	float punch = 0.7 + 0.3 * u_intensity * u_complexity * u_speed * u_peak;

    float t = u_time * 0.1;
    float z = 0.0;

    vec2 p = 7.0 * v_uv * punch; 
    z += sin(p.x * (0.7 + 0.3 * u_intensity) + t) * 0.3;
    z += cos(p.y * (0.3 + 0.7 * u_complexity) + u_time * 0.7) * 0.5;
    z += sin(p.x * (0.7 + 0.3 * u_speed) + p.y * (0.3 + 0.7 * u_peak) + t * 0.3);
	
	vec2 offset = vec2(
		sin(t * u_intensity) + cos(u_time * u_complexity),
		cos(u_time * u_speed) + sin(t * u_peak)
	);
	
	vec2 centered = v_uv - 0.5 + offset * 11.0;
	float r = length(centered);
	float depth = 1.0 / (sqrt(r * r + 0.01)); 
	float mask = pow(1.0 - smoothstep(0.0, 0.5, r), 3.0);
	
	p.xy *= mask;

	
	float lrc = pow(u_left-u_right, 2.0);
	
	z *= 1.0 - punch;
	
	if(p.x < 0.5){
		p.x *= pow((1.0 + lrc) * u_speed * (1.0 + abs(p.y)) * (1.0 + abs(z)), 3.0);
	} else {
		p.x *= pow((1.0 - lrc) * u_speed * (1.0 + abs(p.y)) * (1.0 + abs(z)), 3.0);
	}
	
	p.y *= pow((1.0 - abs(lrc)) * u_complexity * (1.0 + abs(p.x)) * (1.0 + abs(z)), 2.0);

    v_z = z; 

	vec3 pos = vec3(
		position.xy,
		v_z + pow(depth, 3.0) * punch
	);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}