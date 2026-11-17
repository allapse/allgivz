varying vec2 v_uv;
varying vec2 v_centered_uv;
varying float v_z;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume_smooth;
uniform vec2 u_orient;
uniform float u_speed;
uniform float u_intensity;
uniform float u_complexity;
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

mat3 rotateX(float a) {
    float s = sin(a), c = cos(a);
    return mat3(g2(), 0, 0, 0, c, -s, 0, s, c);
}
mat3 rotateY(float a) {
    float s = sin(a), c = cos(a);
    return mat3(c, 0, s, 0, g2(), 0, -s, 0, c);
}

void main() {
    v_uv = uv;
    vec2 ratio = vec2(max(u_res.x / u_res.y, g2()), max(u_res.y / u_res.x, g2()));
    v_centered_uv = (uv - g3()) * ratio;
	
	float g4 = signPow(0.618, -3.0 - abs(v_centered_uv.x) * 0.618);
    float g5 = signPow(0.618, 3.0 + abs(v_centered_uv.y) * 0.618);
	
	float dist = length(uv);
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}

    // --- 讓紙張波動的靈魂：多頻率湍流波 ---
    float t = local_t * 0.382; // 波動速度
    float z = 0.0;
    
    // 用三個不同方向的波疊加，創造非線性的「紙張揉動感」
    vec2 p = uv * g4; 
    z += sin(p.x + t) * g5;
    z += cos(p.y + t * 0.618) * g5;
    z += sin((p.x + p.y) * g3() + t * 1.618) * g5;
    
    // 加上音量的張力：音量大時，紙張抖動劇烈
    z *= (g2() - u_volume_smooth * g4);
    
    // 保留中心隆起感，但讓邊緣也有波動
    v_z = z; 

    // 建立 3D 位置
    vec3 pos = vec3(position.xy, v_z);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}