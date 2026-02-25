varying vec2 v_uv;
varying vec2 v_centered_uv;
varying float v_z;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume_smooth;
uniform vec2 u_orient;

mat3 rotateX(float a) {
    float s = sin(a), c = cos(a);
    return mat3(1, 0, 0, 0, c, -s, 0, s, c);
}
mat3 rotateY(float a) {
    float s = sin(a), c = cos(a);
    return mat3(c, 0, s, 0, 1, 0, -s, 0, c);
}

void main() {
    v_uv = uv;
    vec2 ratio = vec2(max(u_res.x / u_res.y, 1.0), max(u_res.y / u_res.x, 1.0));
    v_centered_uv = (uv - 0.5) * ratio;

    // --- 讓紙張波動的靈魂：多頻率湍流波 ---
    float t = u_time * 0.5; // 波動速度
    float z = 0.0;
    
    // 用三個不同方向的波疊加，創造非線性的「紙張揉動感」
    vec2 p = uv * 4.0; 
    z += sin(p.x + t) * 0.1;
    z += cos(p.y + t * 0.8) * 0.1;
    z += sin((p.x + p.y) * 0.5 + t * 1.2) * 0.05;
    
    // 加上音量的張力：音量大時，紙張抖動劇烈
    z *= (1.0 + u_volume_smooth * 2.0);
    
    // 保留中心隆起感，但讓邊緣也有波動
    v_z = z; 

    // 建立 3D 位置
    vec3 pos = vec3(position.xy, v_z);

    // 套用你最喜歡的微小翻轉 (書頁感)
    float angleX = sin(u_orient.y - 0.03 + t * 0.01) * cos(0.05 * t);
    float angleY = cos(u_orient.x - 0.05 + t * 0.01) * sin(0.03 * t);
    //pos = rotateX(angleX) * rotateY(angleY) * pos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}