varying vec2 v_uv;
varying vec2 v_centered_uv;
varying float v_z;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume_smooth;
uniform float u_speed;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_darkGlow;
uniform vec2 u_orient;

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
    vec2 ratio = vec2(max(u_res.x / u_res.y, 1.0), max(u_res.y / u_res.x, 1.0));
    v_centered_uv = (uv - 0.5) * ratio;
	
	float dist = length(v_centered_uv);
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	float g4 = signPow(0.618, -2.618 - abs(v_centered_uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + abs(v_centered_uv.y) * 0.618);

    // --- 讓紙張波動的靈魂：多頻率湍流波 ---
    float t = local_t * 0.382; // 波動速度
    float z = 0.0;
    
    // 用三個不同方向的波疊加，創造非線性的「紙張揉動感」
    vec2 p = uv * 4.237; 
    z += sin(p.x + t) * 0.146;
    z += cos(p.y + t * 0.618) * 0.146;
    z += sin((p.x + p.y) * g3() + t * 1.618) * 0.0557;
    
    // 加上音量的張力：音量大時，紙張抖動劇烈
    z *= (g3() + u_volume_smooth * g4);
    
    // 保留中心隆起感，但讓邊緣也有波動
    v_z = z; 

    // 建立 3D 位置
    vec3 pos = vec3(position.xy, v_z);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}