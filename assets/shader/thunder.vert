varying vec2 v_uv;
varying vec2 v_centered_uv;
uniform vec2 u_res;
uniform float u_volume_smooth;

void main() {
    v_uv = uv;
    vec2 ratio = vec2(max(u_res.x / u_res.y, 1.0), max(u_res.y / u_res.x, 1.0));
    
    // 不合理點：讓座標隨音量從中心向外「鼓起」
    vec2 pulseUV = (uv - 0.5);
    float dist = length(pulseUV);
    pulseUV *= (1.0 + sin(dist * 10.0) * u_volume_smooth * 0.2);
    
    v_centered_uv = pulseUV * ratio;
    gl_Position = vec4(position, 1.0);
}