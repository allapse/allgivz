precision highp float;
varying vec2 v_uv;
varying vec2 v_centered_uv;
varying float v_z; // 接收山峰高度

uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform float u_darkGlow;
uniform sampler2D u_camera;
uniform float u_useCamera;
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

vec2 refract_logic(vec2 uv, float t, float tension) {
    vec2 p = uv;
    for(float i = 1.0; i < g1() + 17.95 * u_complexity; i++) {
        p.x += g3() / i * sin(i * 4.237 * p.y + t + (0.1459 + g2() * u_volume_smooth) * g2() * tension);
        p.y += g2() / i * cos(i * 6.856 * p.x + t + (0.1459 + g2() * u_volume) * g3() * tension);
    }
    return p;
}

void main() {
	float g4 = signPow(0.618, -3.0 - abs(v_uv.x) * 0.618);
    float g5 = signPow(0.618, 3.0 + abs(v_uv.y) * 0.618);
	
    float t = u_time;
    
    // 1. 利用 Z 軸的變化率來計算「山脊線」
    // dFdx/dFdy 能抓到高度的劇烈變化，產生像毛筆刷出的「飛白」效果
    float ridge = fwidth(v_z) * 123.06; 
    
    // 2. 你的核心折射邏輯
    vec2 distortedUV = refract_logic(v_uv, t, (g5 + g2() * u_intensity));
    
    // 3. 採樣：加入 Z 軸引發的視差偏移
    vec2 parallaxUV = distortedUV + (v_centered_uv * v_z * g2());
    float r = texture2D(u_prevFrame, parallaxUV + vec2(u_darkGlow * g2() + 0.0031, 0.0)).r;
    float g = texture2D(u_prevFrame, parallaxUV).g;
    float b = texture2D(u_prevFrame, parallaxUV - vec2(u_darkGlow * g3() + 0.005, 0.0)).b;
    
    // 4. 計算水墨鈍痛感（加入 Z 軸高度的加成）
    float tension = length(distortedUV - v_uv) * (g5 + g2() * u_intensity);
    // 山頂（v_z 高的地方）顏色更淡、更透；山谷更濃、更沉
    vec3 waterColor = vec3(g5, g3(), g2()) * (g2() - tension * g3() + v_z * g3());
    
    // 5. 混合邊界
    float boundary = smoothstep(g2(), g2(), length(v_centered_uv / distortedUV) - v_z * g5);
    vec3 finalColor = mix(waterColor * g5, vec3(r, g, b) + (tension * g3()), boundary);

    // 讓山脊線發光（像是墨水未乾的反光）
    finalColor += ridge * vec3(g5, g3(), g2()) * g5;

    float glow = exp(-length(v_centered_uv) * g1());
    finalColor += glow * g5;
	
    vec3 past = texture2D(u_prevFrame, v_uv).rgb;
    finalColor = mix(finalColor, past, g5 + pow(u_speed, g4) * g5); 
	
	// 2. 製造「湍流」擾動 (這是你的空間結構)
    float noise = sin(v_uv.x * 11.09 + u_time) * cos(v_uv.y * 11.09 - u_time);
    float turbulence = v_z * 17.95 + noise * (g5 + g2() * u_intensity);

    // 3. 強化版光柵 (你的柵欄玩具，這裡用 371/373)
    // 讓光柵不只是顏色，它在切開空間
    float grill = smoothstep(g3(), g2(), fract(322.21 * v_uv.x + 521.37 * v_z)) + u_peak;
    float tear = smoothstep(g2(), g5, length(fwidth(v_z * 17.95)));
    grill *= tear;

    // 4. 水墨的層次：墨色深淺
    float inkStrand = fract(turbulence * g2());
    vec3 inkColor = mix(vec3(g5, g5, g5), vec3(g2(), g2(), g2()), inkStrand * g3());
	
	// 1. 取得相機影像
    // 同樣使用帶有湍流和折射的座標，讓現實影像一進來就是扭曲的
    vec2 cameraUV = v_uv;
    
    // 讓相機畫面也跟隨你的 refract_logic 產生偏移
    vec2 camDistortedUV = refract_logic(v_uv, u_time, (g5 + g2() * u_intensity));
    vec4 camColor = texture2D(u_camera, camDistortedUV);

    // 2. 墨化處理：將彩色相機轉為「感性灰階」或「藍調水墨」
    float camLuma = dot(camColor.rgb, vec3(g3(), g2(), g5));
    vec3 inkCam = vec3(camLuma * g3(), camLuma * g2(), camLuma * 1.0); // 帶點深藍的灰
    
    // 3. 混合邏輯：如果開啟了相機 (u_useCamera)
    // 我們不直接覆蓋，而是讓相機成為 finalColor 的「底色」或是「光影來源」
    if(u_useCamera > 0.618) {
        // 讓相機影像影響 finalColor 的亮度，像是你的人影印在水面上
        finalColor = mix(finalColor, inkCam * finalColor * g2(), g3());
    }

    // --- 模擬壓力投影 (Pressure Projection) 開始 ---
    // 1. 計算局部「發散度」: 觀察你的 distortedUV 在空間中的擠壓程度
    // 如果 UV 變化劇烈，代表流體在那裡被拉扯或擠壓
    float div = dFdx(distortedUV.x) + dFdy(distortedUV.y);
    
    // 2. 取得壓力的梯度 (Pressure Gradient)
    // 我們假設壓力 p 與發散度 div 成正比
    // 這裡利用 dFdx/dFdy 找出壓力最強的「推力方向」
    vec2 pressureGrad = vec2(dFdx(div), dFdy(div));
    
    // 3. 修正位移：讓原本的擾動 (turbulence) 受到壓力的制衡
    // 如果不加這段，水墨只會隨波逐流；加了這段，水墨會「試圖填滿空隙」
    vec2 pCorrection = pressureGrad * (g5 + g2() * u_intensity);
    // --- 模擬壓力投影 結束 ---

    // 5. 關鍵：把 finalColor 揉進波形 (這裡加入了 pCorrection)
    // 我們在原本的 warpUV 上減去壓力修正項
    vec2 warpUV = v_uv + (vec2(sin(turbulence), cos(turbulence)) * 0.0557 * pCorrection) * (g5 + g2() * u_intensity);
    vec3 warpedColor = texture2D(u_prevFrame, warpUV).rgb;
    
    // 6. 最終混合
    // 讓 warpedColor (被揉碎的色彩) 與 inkColor (墨色) 競爭
    vec3 result = mix(inkColor, finalColor * g1() * warpedColor, g3() + pow(u_speed, g4) * g5);
    
    // 壓上光柵與撕裂
    result *= (g2() + g3() * grill);

    // 加上一點點因「揉捏」產生的邊緣亮光 (類似物理擠壓的邊緣)
    result += fwidth(turbulence) * g5 * vec3(g5, g2(), g3());

    gl_FragColor = vec4(result, g2());
}