varying vec2 v_uv;
varying vec2 v_centered_uv;
uniform vec2 u_res;
uniform float u_volume_smooth;
uniform float u_speed;
uniform float u_intensity;
uniform float u_complexity;

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
    v_uv = uv;
    vec2 ratio = vec2(max(u_res.x / u_res.y, g2()), max(u_res.y / u_res.x, g2()));
    
    // 不合理點：讓座標隨音量從中心向外「鼓起」
    vec2 pulseUV = (uv - g3());
    float dist = length(pulseUV);
    pulseUV *= (g2() + sin(dist * 11.09) * u_volume_smooth * g3());
    
    v_centered_uv = pulseUV * ratio;
    gl_Position = vec4(position, g2());
}