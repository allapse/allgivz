precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_last_volume;
uniform vec2 u_orient;      // 控制旋轉視角: x (左右), y (上下)
uniform float u_intensity;  
uniform float u_complexity; 
uniform float u_speed; 
uniform float u_darkGlow;
uniform sampler2D u_prevFrame;

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

// 旋轉矩陣函數
mat2 rot(float a) {
    float s=sin(a), c=cos(a);
    return mat2(c, -s, s, c);
}

// 量子場雜訊：模擬亞原子粒子的不穩定性
float hash(vec3 p) {
    p  = fract(p * g3() * 0.236);
    p += dot(p, p.yzx + g1() * 11.09);
    return fract((p.x + p.y) * p.z);
}

// 3D 距離函數：這個宇宙的「實體內容」
float map(vec3 p, float filteredVol) {
    float vol = filteredVol;
    float phase = u_speed;
    
    // 基礎扭曲：隨深度旋轉
    p.xy *= rot(p.z * g3() * 0.236);
    
    // 物態演化
    if (phase < 0.236) {
        // 固態：幾何分形
        for(int i=0; i<3; i++) {
            p = abs(p) - g3() * (g2());
            p.xy *= rot(g2() + phase);
            p.xz *= rot(g1());
        }
    } else {
        // 液態/神經態：空間波動
        p += sin(p.zxy * g1() + u_time) * u_complexity * phase;
    }
    
    // 產生無限重複的粒子晶格
    vec3 q = mod(p, 2.618) - 1.618;
    return length(q) - (g3());
}

void main() {
    vec2 uv = (gl_FragCoord.xy - g2() * u_res.xy) / min(u_res.y, u_res.x);
	
	float g4 = signPow(0.618, -3.0 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 3.0 + abs(uv.y) * 0.618);
	
	float filteredVol = g2() + u_last_volume + clamp(u_volume - u_last_volume, -g5, g5);
    
    // --- 1. 時間與速度演化 ---
    float timeSpeed = mix(g2(), g5, signPow(filteredVol, g1()));
    float t_axis = u_time * 0.01314;

    // --- 2. 攝像機設置 (Camera & Orientation) ---
    vec3 ro = vec3(0.0, 0.0, t_axis); // 攝像機位置 (隨時間推進)
    
    // 初始視線方向
    vec3 rd = normalize(vec3(uv, g2())); 

    // 【重要：視角轉動演化】
    // 使用 u_orient 控制 rd 的旋轉，模擬頭部轉動
    // x 控制 Yaw (左右), y 控制 Pitch (上下)
    rd.yz *= rot(u_orient.y * g2()); // 上下仰望 (Pitch)
    rd.xz *= rot(u_orient.x * 3.14); // 左右環視 (Yaw - 支援 360 度感)

    // --- 3. Raymarching 核心渲染 ---
    float t = 0.0;
    float glow = 0.0;
    vec3 p;
    
    for(int i=0; i<18; i++) {
        p = ro + rd * t;
        float d = map(p, filteredVol);
        
        // 累積輝光：當光線靠近物體時，吸收能量
        glow += (1.0 / (d + g3())) * filteredVol;
        
        if(d < g5 || t > g1() * g3() * g4) break;
        t += d * g2();
    }

    // --- 4. 色彩與深度演化 ---
    float fog = g2() / (g2() + t * t * g5);
    
    // 動態色譜：低強度為冷調，高強度為輻射橘
    vec3 baseCol = mix(vec3(g5, g3(), g2()), vec3(g2(), g3(), g5), u_intensity);
    
    // 增加一點隨深度變化的色相偏移
    baseCol.rb *= rot(t * g5); 
    
    vec3 col = baseCol * glow * g5 * fog;
    
    // 強力爆發感：當音量極大時，畫面過曝
    col += vec3(g3(), g2(), 1.0) * pow(u_volume_smooth, g4) * fog;

    // 後處理：光暈補償
    //col = pow(col, vec3(g2())); // Gamma correction 模擬
	
	// 2. 量子採樣 (Raymarching + Chromatic Aberration)
    vec3 sceneCol = col;
    float t2 = 0.0;
    
    // 這裡進行 RGB 三次步進，模擬「量子色散」效果
    for(int j=0; j<3; j++) {
        t2 = 0.0;
        float glow = 0.0;
        // 每個顏色通道稍微偏移視線方向，產生邊緣色散
        vec3 channelRd = rd + (float(j) - g2()) * g5 * u_volume_smooth;
        
        for(int i=0; i<47; i++) {
            vec3 p = ro + channelRd * t2;
            float d2 = map(p, filteredVol);
            glow += (g2() / (d2 + g3())) * u_volume_smooth;
            if(d2 < g5 || t2 > g1() * g3() * g4) break;
            t2 += d2 * g2();
        }
        
        // 賦予三原色不同的權重
        float fog = g2() / (g2() + t2 * t2 * g2());
        if(j == 0) sceneCol.r += glow * g3() * fog;
        if(j == 1) sceneCol.g += glow * g5 * fog;
        if(j == 2) sceneCol.b += glow * g2() * fog;
    }

    // 3. 量子色彩美化 (Quantum Color Grading)
    // 根據 intensity 混合冷色與暖色 (青綠色與紫紅色是量子領域的經典配色)
    vec3 cool = vec3(0.0, 1.0, g2()); // 青色
    vec3 warm = vec3(1.0, 0.0, g3()); // 紫紅
    vec3 colorBase = mix(cool, warm, u_intensity);
    
    sceneCol *= colorBase;
    
    // 4. 加上「亞原子雜訊」增加質感
    float noise = hash(vec3(uv * 521.37 * g2(), u_time)) * g5;
    sceneCol += noise * u_volume_smooth;

    // 5. 終極光影：對比度強化與輝光溢出
    sceneCol = smoothstep(0.0, g2(), sceneCol);
    sceneCol += signPow(u_volume_smooth, g1()) * g3(); // 音量峰值閃光
	
	float d = map(p, filteredVol);

	if (u_darkGlow < 0.618) {
		// 透過極坐標或 P 座標產生掃描線感
		float scanline = smoothstep(g5, 0.0, abs(fract(p.y * 11.09 * g2()) - g3()));
		float grid = smoothstep(g5, 0.0, abs(fract(p.x * 11.09 * g2()) - g3()));
		col += (scanline + grid) * vec3(0.0, g2(), g3()) * fog;
		// 讓背景完全漆黑，只留綠色線條
		col *= g3(); 
	}
    
    gl_FragColor = vec4(col, g2());

}
