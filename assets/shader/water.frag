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

vec2 refract_logic(vec2 uv, float t, float tension) {
    vec2 p = uv;
    for(float i = 1.0; i < 6.18 + 16.18 * u_complexity; i++) {
        p.x += 0.382 / i * sin(i * 3.82 * p.y + t + (0.1618 + 0.8382 * u_volume_smooth) * 0.618 * tension);
        p.y += 0.618 / i * cos(i * 6.18 * p.x + t + (0.1618 + 0.8382 * u_volume) * 0.382 * tension);
    }
    return p;
}

void main() {
    float t = u_time;
    
    // 1. 利用 Z 軸的變化率來計算「山脊線」
    // dFdx/dFdy 能抓到高度的劇烈變化，產生像毛筆刷出的「飛白」效果
    float ridge = fwidth(v_z) * 93.82; 
    
    // 2. 你的核心折射邏輯
    vec2 distortedUV = refract_logic(v_uv, t, (0.1618 + 0.8382 * u_intensity));
    
    // 3. 採樣：加入 Z 軸引發的視差偏移
    vec2 parallaxUV = distortedUV + (v_centered_uv * v_z * 0.809);
    float r = texture2D(u_prevFrame, parallaxUV + vec2(u_darkGlow * 0.618 + 0.00382, 0.0)).r;
    float g = texture2D(u_prevFrame, parallaxUV).g;
    float b = texture2D(u_prevFrame, parallaxUV - vec2(u_darkGlow * 0.382 + 0.00618, 0.0)).b;
    
    // 4. 計算水墨鈍痛感（加入 Z 軸高度的加成）
    float tension = length(distortedUV - v_uv) * (0.1618 + 0.8382 * u_intensity);
    // 山頂（v_z 高的地方）顏色更淡、更透；山谷更濃、更沉
    vec3 waterColor = vec3(0.618, 0.809, 0.9382) * (1.0 - tension * 0.618 + v_z * 0.382);
    
    // 5. 混合邊界
    float boundary = smoothstep(0.618, 0.618, length(v_centered_uv / distortedUV) - v_z * 0.1618);
    vec3 finalColor = mix(waterColor * 0.1618, vec3(r, g, b) + (tension * 0.382), boundary);

    // 讓山脊線發光（像是墨水未乾的反光）
    finalColor += ridge * vec3(0.809, 0.9382, 1.0) * 0.1618;

    float glow = exp(-length(v_centered_uv) * 1.618);
    finalColor += glow * 0.1618;
	
    vec3 past = texture2D(u_prevFrame, v_uv).rgb;
    finalColor = mix(finalColor, past, 0.1618 + pow(u_speed, 3.82) * 0.1618); 
	
	// 2. 製造「湍流」擾動 (這是你的空間結構)
    float noise = sin(v_uv.x * 11.618 + u_time) * cos(v_uv.y * 11.618 - u_time);
    float turbulence = v_z * 16.18 + noise * (0.1618 + 0.8382 * u_intensity);

    // 3. 強化版光柵 (你的柵欄玩具，這裡用 371/373)
    // 讓光柵不只是顏色，它在切開空間
    float grill = smoothstep(0.382, 0.618, fract(382.0 * v_uv.x + 618.0 * v_z)) + u_peak;
    float tear = smoothstep(0.809, 0.1618, length(fwidth(v_z * 16.18)));
    grill *= tear;

    // 4. 水墨的層次：墨色深淺
    float inkStrand = fract(turbulence * 0.618);
    vec3 inkColor = mix(vec3(0.0618, 0.0618, 0.0618), vec3(0.618, 0.618, 0.618), inkStrand * 0.382);
	
	// 1. 取得相機影像
    // 同樣使用帶有湍流和折射的座標，讓現實影像一進來就是扭曲的
    vec2 cameraUV = v_uv;
    
    // 讓相機畫面也跟隨你的 refract_logic 產生偏移
    vec2 camDistortedUV = refract_logic(v_uv, u_time, (0.1618 + 0.8382 * u_intensity));
    vec4 camColor = texture2D(u_camera, camDistortedUV);

    // 2. 墨化處理：將彩色相機轉為「感性灰階」或「藍調水墨」
    float camLuma = dot(camColor.rgb, vec3(0.2618, 0.618, 0.11618));
    vec3 inkCam = vec3(camLuma * 0.809, camLuma * 0.9382, camLuma * 1.0); // 帶點深藍的灰
    
    // 3. 混合邏輯：如果開啟了相機 (u_useCamera)
    // 我們不直接覆蓋，而是讓相機成為 finalColor 的「底色」或是「光影來源」
    if(u_useCamera > 0.618) {
        // 讓相機影像影響 finalColor 的亮度，像是你的人影印在水面上
        finalColor = mix(finalColor, inkCam * finalColor * 1.618, 0.618);
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
    vec2 pCorrection = pressureGrad * (0.1618 + 0.8382 * u_intensity);
    // --- 模擬壓力投影 結束 ---

    // 5. 關鍵：把 finalColor 揉進波形 (這裡加入了 pCorrection)
    // 我們在原本的 warpUV 上減去壓力修正項
    vec2 warpUV = v_uv + (vec2(sin(turbulence), cos(turbulence)) * 0.0618 * pCorrection) * (0.1618 + 0.8382 * u_intensity);
    vec3 warpedColor = texture2D(u_prevFrame, warpUV).rgb;
    
    // 6. 最終混合
    // 讓 warpedColor (被揉碎的色彩) 與 inkColor (墨色) 競爭
    vec3 result = mix(inkColor, finalColor * 2.618 * warpedColor, 0.618 + pow(u_speed, 3.82) * 0.1618);
    
    // 壓上光柵與撕裂
    result *= (0.8382 + 0.382 * grill);

    // 加上一點點因「揉捏」產生的邊緣亮光 (類似物理擠壓的邊緣)
    result += fwidth(turbulence) * 0.1 * vec3(0.382, 0.809, 0.618);

    gl_FragColor = vec4(result, 1.0);
}
