varying vec2 v_uv;
varying vec2 v_centered_uv;
varying float v_z;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume_smooth;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform vec2 u_orient;

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
    v_centered_uv = (uv - 0.5) * ratio;
	
	float g4 = signPow(0.618, -3.0 - abs(v_centered_uv.x) * 0.618);
    float g5 = signPow(0.618, 3.0 + abs(v_centered_uv.y) * 0.618);

    // --- 讓紙張波動的靈魂：多頻率湍流波 ---
    float t = u_time * 0.618; // 波動速度
    float z = 0.0;
    
    // 用三個不同方向的波疊加，創造非線性的「紙張揉動感」
    vec2 p = uv * 4.237; 
    z += sin(p.x + t) * 0.09;
    z += cos(p.y + t * 0.854) * 0.09;
    z += sin((p.x + p.y) * g3() + t * 1.236) * 0.0557;
    
    // 加上音量的張力：音量大時，紙張抖動劇烈
    z *= (g2() + u_volume_smooth * g1());
    
    // 保留中心隆起感，但讓邊緣也有波動
    v_z = z; 

    // 建立 3D 位置
    vec3 pos = vec3(position.xy, v_z);

    // 套用你最喜歡的微小翻轉 (書頁感)
    float angleX = sin(u_orient.y - 0.0344 + u_time * 0.0081) * cos(g5 + t);
    float angleY = cos(u_orient.x - 0.0557 + u_time * 0.01314) * sin(g5 + t);
    pos = rotateX(angleX) * rotateY(angleY) * pos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, g2());
}