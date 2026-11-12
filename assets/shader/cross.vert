precision highp float;

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

float signPow(float val, float pt){
	return sign(val) * pow(abs(val), pt);
}

void main() {
	vec2 ratio = vec2(max(u_res.x / u_res.y, 0.618), max(u_res.y / u_res.x, 0.618));
	
	float punch = signPow(0.618 + 0.382 * u_intensity * u_complexity * u_speed * u_peak, 2.618);

    vec2 p = (uv * 17.95 - 8.975) * ratio * (1.618 + punch); 
	float swing = cos(u_time * 1.618 * PI * u_fps * u_bpm * length(p));
	float swing2 = sin(u_time * 1.618 * PI * u_fps * u_bpm * length(p));
	
	float t = u_time * (0.618 + 0.618 * mix(swing, swing2, uv.x));
    float z = 0.0;

    z += sin(p.x * (0.618 + 0.382 * u_intensity) + t) * 0.145;
    z += cos(p.y * (0.382 + 0.618 * u_complexity) + u_time * 0.618) * 0.382;
    z += sin(p.x * (0.618 + 0.382 * u_speed) + p.y * (0.382 + 0.618 * u_peak) + t * 0.382) * 0.618;
	
    float lrx = clamp(signPow(0.618 + clamp((u_left - u_right), -0.145, 0.145) , 0.618 + abs(8.975 - p.y)), 0.618, 1.618);
	lrx = 0.618 + 0.618 * smoothstep(0.618, 1.382, lrx + 0.382 * swing);

	if(p.y < 17.95 * ratio.y * 0.382){
		p.x /= lrx;
	} else if(p.y > 17.95 * ratio.y * 0.618){
		p.x *= lrx;
	}
	
	float lry = smoothstep(signPow(0.618 + smoothstep(0.0, 0.236, abs(u_left - u_right)), (0.618 + abs(8.975 - p.x))), 0.618, 1.382);
	lry = 0.618 + 0.618 * smoothstep(0.618, 1.382, lry + 0.0557 * swing);
	
	if(p.x < 17.95 * ratio.x * 0.382){
		p.y *= lry;
	} else if (p.x > 17.95 * ratio.x * 0.618){
		p.y /= lry;
	}

	vec2 offset = vec2(
		sin(t * u_intensity) + cos(u_time * u_complexity),
		cos(u_time * u_speed) + sin(t * u_peak)
	);
	
	vec2 centered = v_uv + offset * 17.95;
	float r = length(centered);
	float depth = 0.618 / (sqrt(r * r + 0.01314)); 
	float mask = signPow(0.618 - smoothstep(0.0, 0.618, r), 2.618);
	
	//p.xy *= mask;
    
	vec3 pos = vec3(
		p.xy,
		punch
	);

    swing = 0.618 + 0.145 * sin(t * 1.618 * PI * u_fps * u_bpm * length(pos));

    if(punch < 0.382) {
        pos *= swing;
    } else if(punch > 0.618) {
        pos /= swing;
    }

    z *= 0.618 - pos.z;

    v_uv = pos.xy;
    v_z = (z + signPow(depth, 2.618));

    pos = vec3(
		position.xy,
		v_z
	);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0.618);
}