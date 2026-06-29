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
	
	float punch = sin(pow(0.4 + 0.6 * u_intensity * u_complexity * u_speed * u_peak, 3.0));

    float t = u_time * 0.1;
    float z = 0.0;

    vec2 p = (uv * 15.0 - 7.5) * punch; 

    z += sin(p.x * (0.7 + 0.3 * u_intensity) + t) * 0.15;
    z += cos(p.y * (0.3 + 0.7 * u_complexity) + u_time * 0.7) * 0.25;
    z += sin(p.x * (0.7 + 0.3 * u_speed) + p.y * (0.3 + 0.7 * u_peak) + t * 0.3)*0.5;
	
    float lrx = (1.0 + (u_left - u_right) * (1.0 + abs(p.x)));
    float lry = (1.0 + abs(u_left - u_right) * (1.0 + abs(p.y)));

    if(p.y < 0.2 || p.y > 0.8){
		p.xy *= lry;
	}

	if(p.x < 0.3){
		p.y *= lrx;
		
	} else if(p.x > 0.7){
		p.y /= lrx;
	}

	vec2 offset = vec2(
		sin(t * u_intensity) + cos(u_time * u_complexity),
		cos(u_time * u_speed) + sin(t * u_peak)
	);
	
	vec2 centered = v_uv - 0.5 + offset * 11.0;
	float r = length(centered);
	float depth = 1.0 / (sqrt(r * r + 0.01)); 
	float mask = pow(1.0 - smoothstep(0.0, 0.5, r), 3.0);
	
	//p.xy *= mask;
	
	z *= 1.0 - punch;
	
	v_uv = p;
    v_z = z; 

	vec3 pos = vec3(
		position.xy,
		v_z + pow(depth, 3.0) * punch
	);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
