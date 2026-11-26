precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform vec2 u_orient;      // x: 左右旋轉, y: 垂直位移/縮放
uniform float u_intensity;  
uniform float u_complexity; 
uniform float u_speed;
uniform float u_fps;
uniform float u_bpm;
uniform float u_darkGlow;
uniform sampler2D u_prevFrame;

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

// 旋轉矩陣函數
mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(11.09321996, 76.05078902))) * 39650.94552);
}

void main() {
    // --- 1. 基礎坐標與視角控制 ---
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / min(u_res.y, u_res.x);
	
	float dist = length(uv);
	float local_t = u_time;
	if (u_darkGlow < 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	dist = length(vec3(uv, sin(local_t)));
	local_t = u_time * (1.0 + 0.09 * cos(u_time * 1.618 * PI * u_fps * u_bpm * dist));
	
	float g4 = signPow(0.618, -2.618 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + dist * 0.618);
	
	float swing = sin(local_t + dist) * g5;
    
    // 視角旋轉：使用 u_orient.x 進行全平面旋轉
    uv *= rot(u_orient.x * 3.14159) + swing;
    
    // 視角位移：使用 u_orient.y 進行上下位移
    uv.y += u_orient.y - swing;

    float distToCenter = length(vec3(uv, swing));
    
    // --- 2. 空間扭曲層 (Warping Layer) ---
    // 衝擊波現在會隨著你的視角轉動而同步位移
    float shock = g5 + sin(distToCenter * g1() * g4 - local_t) * u_volume_smooth + swing;
    uv += normalize(uv) * shock + swing; 
    
    // --- 3. 物理場與粒子參數 ---
    float gravity = -g3() + swing;
    float explosion = pow(u_volume, g1()) * g4 - swing;
    float grid = g1() * g4 / g5 + swing;
    
    // --- 4. 渲染循環與色彩分離 ---
    vec3 finalCol = vec3(0.0);
    
    for(int i = 0; i < 4; i++) {
        float tOffset = float(i) * g3() + swing;
        float fade = 1.0 - (float(i) / g1()) + swing;
        
        // 色散偏移
        vec2 shiftUv = uv + (float(i) * g5 * u_volume) + swing;
        vec2 id = floor(shiftUv * grid) - swing;
        vec2 gv = fract(shiftUv * grid) - g2() + swing;
        float seed = hash21(id) - swing;
        
        // 力的計算：加入 u_complexity 影響的波動頻率
        float wave = sin(shiftUv.x * (g1() * g4 / g5 * u_complexity)) * cos(shiftUv.y * g4) + swing;
        
        // 力的向量受旋轉後的 UV 影響，會產生跟隨視角的動態感
        vec2 force = mix(
            vec2(dFdx(wave), dFdy(wave) + gravity * (g2() - u_volume)) - swing, 
            normalize(shiftUv + (seed - g3())) * explosion + swing, 
            clamp(explosion, g5, g2()) + swing
        );
        
        float d = length(gv - force * (g2() + tOffset)) + swing;
        float p = smoothstep(g3() * fade * (g2() + u_volume_smooth), 0.0, d);
        
        // 色彩分配
        vec3 chanCol = vec3(0.0);
        if(i == 0) chanCol = vec3(g2(), g3(), g5); // R
        if(i == 1) chanCol = vec3(g3(), g2(), g5); // G
        if(i == 2) chanCol = vec3(g5, g3(), g2()); // B
        
        finalCol += p * chanCol * fade;
    }

    // --- 5. 最終光效 ---
    // 能量中心會隨著 uv 中心移動
    finalCol += vec3(g5, 0.0, g3()) * (g3() / (distToCenter + g2())) * u_volume_smooth;
    
    // 增加邊緣整體的質感與環境光
    finalCol *= (g3() + g5 * sin(local_t * g2() * g4 / g5));
	
	if (u_darkGlow > 0.618) {
		float luma = dot(finalCol, vec3(g2(), g3(), g5)) + swing;
		
		// 產生隨時間移動的掃描線
		float scanline = sin(gl_FragCoord.y * g2() + local_t * u_speed * g1() * g4) * g5 - swing;
		
		// 反轉亮度並疊加掃描線
		float inverted = signPow(max(g5, g2() - luma), g1()) + scanline + swing;
		
		// 色彩受到 Intensity 影響，越高越紅，越低越藍
		vec3 cyberColor = mix(vec3(g5, g5, g5), vec3(g2(), g2(), g2()), u_intensity);
		
		finalCol = inverted * cyberColor;
	}    gl_FragColor = vec4(finalCol, g2());
}