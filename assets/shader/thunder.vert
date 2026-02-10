varying vec2 v_uv;
varying vec2 v_centered_uv;
uniform vec2 u_res;

void main() {
    v_uv = uv;
    // 修正比例：讓 v_centered_uv 的中心點為 (0,0)，且不隨解析度拉伸
    vec2 ratio = vec2(max(u_res.x / u_res.y, 1.0), max(u_res.y / u_res.x, 1.0));
    v_centered_uv = (uv - 0.5) * ratio;
    
    gl_Position = vec4(position, 1.0);
}