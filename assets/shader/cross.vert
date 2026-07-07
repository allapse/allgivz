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
	
	float punch = pow(0.618 + 0.382 * u_intensity * u_complexity * u_speed * u_peak, 3.0);

    vec2 p = (uv * 16.18 - 8.09) * ratio * (0.618 + punch); 
	float swing = cos(u_time * 2.0 * PI * u_fps * u_bpm * length(p));
	float swing2 = sin(u_time * 2.0 * PI * u_fps * u_bpm * length(p));
	
	float t = u_time * (1.0 + 0.118 * mix(swing, swing2, uv.x));
    float z = 0.0;

    z += sin(p.x * (0.618 + 0.382 * u_intensity) + t) * 0.118;
    z += cos(p.y * (0.382 + 0.618 * u_complexity) + u_time * 0.618) * 0.382;
    z += sin(p.x * (0.618 + 0.382 * u_speed) + p.y * (0.382 + 0.618 * u_peak) + t * 0.382) * 0.618;
	
    float lrx = clamp(pow(1.0 + clamp((u_left - u_right), -0.118, 0.118) , 1.0 + abs(8.09 - p.y)), 0.882, 1.118);
	lrx = 0.882 + 0.382 * smoothstep(0.618, 1.382, lrx + 0.382 * swing);

	if(p.y < 16.18 * ratio.y * 0.382){
		p.x /= lrx;
	} else if(p.y > 16.18 * ratio.y * 0.618){
		p.x *= lrx;
	}
	
	float lry = smoothstep(pow(0.882 + smoothstep(0.0, 0.228, abs(u_left - u_right)), (1.0 + abs(8.09 - p.x))), 0.618, 1.382);
	lry = 0.882 + 0.228 * smoothstep(0.618, 1.382, lry + 0.0618 * swing);
	
	if(p.x < 16.18 * ratio.x * 0.382){
		p.y *= lry;
	} else if (p.x > 16.18 * ratio.x * 0.618){
		p.y /= lry;
	}

	vec2 offset = vec2(
		sin(t * u_intensity) + cos(u_time * u_complexity),
		cos(u_time * u_speed) + sin(t * u_peak)
	);
	
	vec2 centered = v_uv + offset * 16.18;
	float r = length(centered);
	float depth = 1.0 / (sqrt(r * r + 0.01)); 
	float mask = pow(1.0 - smoothstep(0.0, 0.618, r), 3.0);
	
	//p.xy *= mask;
    
	vec3 pos = vec3(
		p.xy,
		punch
	);

    swing = 1.0 + 0.118 * sin(t * 2.0 * PI * u_fps * u_bpm * length(pos));

    if(punch < 0.382) {
        pos *= swing;
    } else if(punch > 0.618) {
        pos /= swing;
    }

    z *= 1.0 - pos.z;

    v_uv = pos.xy;
    v_z = (z + pow(depth, 3.0));

    pos = vec3(
		position.xy,
		v_z
	);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}