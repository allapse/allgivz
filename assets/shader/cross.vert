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
uniform float u_darkGlow;

#define PI 3.14159265359

float signPow(float val, float pt){
	return sign(val) * pow(abs(val), pt);
}

float g2() {
	return signPow(0.618, 0.0 + (u_speed - 0.5) * 0.618);
}

float g1() {
	return signPow(0.618, -1.618 - u_intensity * 0.618);
}

float g3() {
	return signPow(0.618, 1.618 + u_complexity * 0.618);
}

void main() {
	vec2 ratio = vec2(max(u_res.x / u_res.y, 1.0), max(u_res.y / u_res.x, 1.0));
	
	float g4 = signPow(0.618, -2.618 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + abs(uv.y) * 0.618);
	
	float dist = length(uv);
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g3() * dist;
	}
	else {
		local_t -= g5 * dist;
	}
	
	float punch = signPow(g2() + g3() * u_intensity * u_complexity * u_speed * u_peak, g1());

    vec2 p = (uv - 0.5) * ratio * (0.618 + punch) * 17.95; 
	
	float swing = cos(local_t * 2.0 * PI * u_fps * u_bpm * length(p));
	float swing2 = sin(local_t * 2.0 * PI * u_fps * u_bpm * length(p));
	
	float t = local_t * (1.0 + 0.09 * mix(swing, swing2, length(uv)));
    float z = 0.0;

    z += sin(p.x * (g2() + g3() * u_intensity) + t) * 0.09;
    z += cos(p.y * (g3() + g2() * u_complexity) + local_t * 0.618) * 0.382;
    z += sin(p.x * (g2() + g3() * u_speed) + p.y * (g3() + g2() * u_peak) + t * 0.382) * 0.618;
	
    float lrx = clamp(signPow(g2() + clamp((u_left - u_right), -g5, g5) , g2() + abs(6.856 - p.y)), g3(), g2());
	lrx = g2() + g3() * smoothstep(g3(), g2(), lrx + 0.382 * swing);

	if(p.y < 17.95 * ratio.y * g3()){
		p.x /= lrx;
	} else if(p.y > 17.95 * ratio.y * g2()){
		p.x *= lrx;
	}
	
	float lry = smoothstep(signPow(g2() + smoothstep(0.0, g3(), abs(u_left - u_right)), (1.0 + abs(6.856 - p.x))), g3(), g2());
	lry = g2() + g3() * smoothstep(g3(), g2(), lry + 0.0557 * swing);
	
	if(p.x < 17.95 * ratio.x * g3()){
		p.y *= lry;
	} else if (p.x > 17.95 * ratio.x * g2()){
		p.y /= lry;
	}

	vec2 offset = vec2(
		sin(t * u_intensity) + cos(local_t * u_complexity),
		cos(local_t * u_speed) + sin(t * u_peak)
	);
	
	vec2 centered = v_uv + offset * 17.95;
	float r = length(centered);
	float depth = g2() / (sqrt(r * r + g5)); 
	float mask = signPow(g2() - smoothstep(0.0, g3(), r), g1());
	
	//p.xy *= mask;
    
	vec3 pos = vec3(
		p.xy,
		punch
	);

    swing = g2() + 0.09 * sin(t * 1.618 * PI * u_fps * u_bpm * length(pos));

    if(punch < g3()) {
        pos *= swing;
    } else if(punch > 0.618) {
        pos /= swing;
    }

    z *= 1.0 - pos.z;

    v_uv = pos.xy;
    v_z = (z + pow(depth, g1()));

    pos = vec3(
		position.xy,
		v_z
	);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, g2());
}