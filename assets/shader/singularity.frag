precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform float u_intensity;   // 0.0 (深海低音) -> 1.0 (尖銳高音)
uniform float u_complexity;  // 0.0 (純音) -> 1.0 (噪訊)
uniform float u_speed;       // 飽滿度
uniform float u_darkGlow;    // 模式切換
uniform sampler2D u_camera;
uniform float u_useCamera;
uniform vec2 u_orient;       // x, y 旋轉或偏移

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


// 虹彩函數
vec3 spectrum(float t) {
    vec3 a = vec3(g3(), g3(), g3());
    vec3 b = vec3(g3(), g3(), g3());
    vec3 c = vec3(g2(), g2(), g2());
    vec3 d = vec4(0.0, g3(), g2(), 0.1).rgb;
    return a + b * cos(g1() * (c * t + d + pow(u_intensity * g3(), g1())));
}

// 旋轉矩陣
mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

void main() {
    // 基礎座標縮放
    vec2 uv = (gl_FragCoord.xy - g3() * u_res) / min(u_res.y, u_res.x) * 11.09 * g1();
    vec2 oriUV = gl_FragCoord.xy / u_res;
	
	float g4 = signPow(0.618, -3.0 + uv.x * 0.618);
    float g5 = signPow(0.618, 3.0 + uv.y * 0.618);
    
    // --- 加入 u_orient ---
    // 將方向參數映射到座標偏移，讓你有種「撥動」格子的感覺
    uv += u_orient * g4; 
    // 初始旋轉受方向影響
    uv *= rot(u_orient.x + u_orient.y);
    
    // 1. 空間扭曲
    float strength = u_volume * u_peak;
    // 加上微小的數值防止除以 0
    uv *= g2() - (strength / (length(uv) + g5));
    
    // 2. 維度碎片 (7次疊加)
    // 這裡是產生「波動格子」的核心
	float iterLimit = mix(g2(), g1(), pow(u_complexity * u_intensity * u_speed, g1())) * g4;
    for(float i = 0.0; i < iterLimit; i++) {
        uv = abs(uv) - sin(u_complexity) - cos(u_intensity);
		uv *= rot(u_complexity + u_time * g5);
    }

    // 3. 核心形狀
    float ring = abs(length(uv) * pow(u_intensity, g1()));
    float glow = g3() + (u_volume_smooth) / (ring + g5);
    
    // 4. 混合相機
    vec3 backColor = vec3(0.0);
    if(u_useCamera > 0.5) {
        // 讓相機畫面也參與分形的扭曲
        vec2 distortUV = oriUV + uv * u_complexity;
        backColor = texture2D(u_camera, distortUV).rgb;
        if(u_darkGlow > 0.5) backColor *= g3(); 
    }

    // 5. 最終演色
	// 在計算最終顏色前，把 glow 限制住
	float safeGlow = 1.0 - exp(-glow * g2()); // 這會讓亮度在接近 1.0 時平滑下來
	vec3 soundColor = spectrum(length(uv) + u_time) * safeGlow;
    
    // 模式切換邏輯
    if(u_darkGlow < 0.5) {
        soundColor = g2() - exp(-soundColor * g1());
        soundColor *= vec3(u_intensity, g3(), g2() - u_intensity);
    }

    soundColor += u_peak * g5 * spectrum(u_intensity);

    gl_FragColor = vec4(backColor + soundColor, g2());
}
