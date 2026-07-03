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
uniform float u_fps;
uniform float u_bpm;
uniform vec2 u_orient;

#define PI 3.14159265359

void main() {
	vec2 ratio = vec2(max(u_res.x / u_res.y, 1.0), max(u_res.y / u_res.x, 1.0));
	
	float punch = pow(0.7 + 0.3 * u_intensity * u_complexity * u_speed * u_peak, 3.0);

    float t = u_time * 0.1;
    float z = 0.0;

    vec2 p = (uv * 15.0 - 7.5) * ratio * (0.5 + punch); 

    z += sin(p.x * (0.7 + 0.3 * u_intensity) + t) * 0.15;
    z += cos(p.y * (0.3 + 0.7 * u_complexity) + u_time * 0.7) * 0.25;
    z += sin(p.x * (0.7 + 0.3 * u_speed) + p.y * (0.3 + 0.7 * u_peak) + t * 0.3)*0.5;
	
	float swing = sin(u_time * 2.0 * PI * u_fps * u_bpm * length(p));
    float lrx = clamp(pow(1.0 + clamp((u_left - u_right), -0.1, 0.1) , 1.0 + abs(7.5 - p.y)), 0.85, 1.15);
	lrx = 0.85 + 0.3 * smoothstep(0.7, 1.3, lrx + 0.3 * swing);

	if(p.y < 7.0){
		p.x /= lrx;
	} else if(p.y > 8.0){
		p.x *= lrx;
	}
	
	float lry = smoothstep(pow(0.95 + smoothstep(0.0, 0.1, abs(u_left - u_right)), (1.0 + abs(7.5 - p.x))), 0.9, 1.1);
	lry = 0.85 + 0.2 * smoothstep(0.8, 1.2, lry + 0.05 * swing); 
	
	if(p.x < 5.0){
		p.y *= lry;
	} else if (p.x > 10.0){
		p.y /= lry;
	}

	vec2 offset = vec2(
		sin(t * u_intensity) + cos(u_time * u_complexity),
		cos(u_time * u_speed) + sin(t * u_peak)
	);
	
	vec2 centered = v_uv + offset * 20.0;
	float r = length(centered);
	float depth = 1.0 / (sqrt(r * r + 0.01)); 
	float mask = pow(1.0 - smoothstep(0.0, 0.5, r), 3.0);
	
	//p.xy *= mask;
	
	z *= 1.0 - punch;
	
	v_uv = p;
    v_z = z; 

	vec3 pos = vec3(
		position.xy,
		v_z + pow(depth, 3.0)
	);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
