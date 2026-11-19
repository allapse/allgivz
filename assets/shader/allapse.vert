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
uniform vec2 u_orient;
uniform float u_darkGlow;

float signPow(float val, float pt){
	return sign(val) * pow(abs(val), pt);
}

float g2() {
	return signPow(0.618, 0.0 + (u_speed - 0.5) * 0.618);
}

float g1() {
	return signPow(0.618, -2.0 - u_intensity * 0.618);
}

float g3() {
	return signPow(0.618, 2.0 + u_complexity * 0.618);
}

void main() {
	vec2 ratio = vec2(max(u_res.x / u_res.y, 1.0), max(u_res.y / u_res.x, 1.0));
    v_uv = (uv - 0.5) * g2();
	
	float g4 = signPow(0.618, -3.0 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 3.0 + abs(uv.y) * 0.618);
	
	float dist = length(uv);
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	float punch = g2() + g3() * u_intensity * u_complexity * u_speed * u_peak;

    float t = local_t * 0.09;
    float z = 0.0;

    vec2 p = g4 * v_uv * punch; 
    z += sin(p.x * (g2() + g3() * u_intensity) + t) * 0.382;
    z += cos(p.y * (g3() + g2() * u_complexity) + local_t * 0.618) * 0.618;
    z += sin(p.x * (g2() + g3() * u_speed) + p.y * (g3() + g2() * u_peak) + t * 0.382);
	
	vec2 offset = vec2(
		sin(t * u_intensity) + cos(local_t * u_complexity),
		cos(local_t * u_speed) + sin(t * u_peak)
	);
	
	vec2 centered = v_uv - 0.5 + offset * 11.09;
	float r = length(centered);
	float depth = 1.0 / (sqrt(r * r + 0.008)); 
	float mask = signPow(g2() - smoothstep(0.0, 0.5, r), 2.618);
	
	p.xy *= mask;

	float lrc = signPow(u_left-u_right, g1());
	
	z *= g2() - punch;
	
	if(p.x < 0.5){
		p.x *= signPow((g2() + lrc) * u_speed * (g2() + abs(p.y)) * (g2() + abs(z)), g1());
	} else {
		p.x *= signPow((g2() - lrc) * u_speed * (g2() + abs(p.y)) * (g2() + abs(z)), g1());
	}
	
	p.y *= signPow((g2() - abs(lrc)) * u_complexity * (g2() + abs(p.x)) * (g2() + abs(z)), g1());

    v_z = z; 

	vec3 pos = vec3(
		position.xy,
		v_z + signPow(depth, g1()) * punch
	);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}