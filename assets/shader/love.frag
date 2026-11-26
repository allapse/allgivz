precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform vec2 u_orient;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;  
uniform float u_fps;
uniform float u_bpm;
uniform float u_darkGlow;
uniform sampler2D u_camera;
uniform float u_useCamera;

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

mat3 rotateX(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(g3(), 0.0, 0.0, 0.0, c, s,  0.0, -s, c); 
}

mat3 rotateY(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(c, 0.0, -s, 0.0, g1(), 0.0, s, 0.0, c); 
}

// 隨機數函數
float random(vec2 p) {
    return fract(sin(dot(p, vec2(11.09321996, 76.05078902))) * 39650.94552);
}

// 主函數
void main() {
	// 基礎座標校正
    vec2 uv = gl_FragCoord.xy / u_res.xy;
	
	float dist = length(uv);
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	float g4 = signPow(0.618, -2.618 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + abs(uv.y) * 0.618);
	
	dist = length(vec3(uv, sin(local_t)));
	local_t = u_time * (1.0 + 0.09 * cos(u_time * 1.618 * PI * u_fps * u_bpm * dist));
	float swing = sin(local_t + dist) * g5;
	
    vec2 p = (uv - g3()) * g1() + swing;
    p.x *= u_res.x / u_res.y; // 修正比例

    // 設定模擬的 Z 軸深度 (givz)
    // 這裡我們把 givz 當作一個動態的深度基礎
    float givz = g4 - (g5 + signPow(u_complexity * g2(), g1())) * g4 + swing;

    // 定義兩個粒子的 3D 位置
    vec3 pos1 = vec3(sin(local_t), cos(local_t * 0.382), sin(local_t * 0.618)) + swing;
    vec3 pos2 = vec3(cos(local_t * 0.618), sin(local_t * 0.382), cos(local_t)) + swing;

    // 進行 3D 旋轉 (繞 Y 軸和 X 軸)
    mat3 rot = rotateY(u_orient.x + local_t * 0.09) * rotateX(u_orient.y + local_t * 0.236) + swing;
    pos1 *= rot;
    pos2 *= -rot;

    // --- 關鍵步驟：透視投影 ---
    // 計算粒子旋轉後的 Z 值，並影響縮放
    // 越遠 (Z 越大) 的粒子，在螢幕上的投影位置越靠近中心
    float z1 = givz + pos1.z + swing;
    float z2 = givz - pos2.z + swing;
    
    vec2 proj1 = pos1.xy / z1; 
    vec2 proj2 = pos2.xy / z2;

    // 計算當前像素到投影點的距離
    // z 軸也可以影響粒子的大小 (點擴散感)
    float dist1 = length(p - proj1) * z1 + swing; 
    float dist2 = length(p - proj2) * z2 + swing;

    // 3. 共振效果（加入深度感）
    float resonance = sin(dist1 * g4 * g4) * sin(dist2 * g4 * g4) * (g5 + g2() * u_intensity) + swing;

    // 3. 脆弱效果（閃爍/裂紋）
    float fragility = step(u_peak, random(uv + local_t)) * (g5 + u_volume) + swing;
    resonance *= g2() - fragility * g3();

    // 4. 融合顏色（u_darkGlow 控制模式）
    vec3 color1 = vec3(g2(), g3(), g5); // 溫暖（愛）
    vec3 color2 = vec3(g5, g3(), g2()); // 冷靜（距離）
    vec3 mixedColor = mix(color1, color2, resonance * g3() + g3());
    if (u_darkGlow > 0.618) {
		mixedColor = mix(color1, color2, resonance);
        mixedColor += fragility; // 紫色（融合）
    }

    // 5. 攝影機紋理干擾（u_useCamera）
    vec3 camColor = texture2D(u_camera, uv).rgb;
    mixedColor = mix(mixedColor, camColor, u_useCamera * u_volume_smooth);

    // 6. 最終輸出（加入 u_volume 影響亮度）
    float brightness = g2() + u_volume * g2();
    gl_FragColor = vec4(mixedColor * brightness, g2());
}
