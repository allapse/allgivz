precision highp float;
varying vec2 v_uv;
varying vec2 v_centered_uv;
varying float v_z; // 接收山峰高度

uniform float u_time;
uniform float u_volume_smooth;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform float u_darkGlow;
uniform sampler2D u_camera;
uniform float u_useCamera;
uniform sampler2D u_prevFrame;

vec2 refract_logic(vec2 uv, float t, float tension) {
    vec2 p = uv;
    for(float i = 1.0; i < 7.0 + 10.0 * u_complexity; i++) {
        p.x += 0.3 / i * sin(i * 3.0 * p.y + t + u_volume_smooth * 0.5 * tension);
        p.y += 0.5 / i * cos(i * 5.0 * p.x + t + u_volume_smooth * 0.3 * tension);
    }
    return p;
}

void main() {
    float t = u_time;
    
    // 1. 利用 Z 軸的變化率來計算「山脊線」
    // dFdx/dFdy 能抓到高度的劇烈變化，產生像毛筆刷出的「飛白」效果
    float ridge = fwidth(v_z) * 100.0; 
    
    // 2. 你的核心折射邏輯
    vec2 distortedUV = refract_logic(v_uv, t, u_intensity);
    
    // 3. 採樣：加入 Z 軸引發的視差偏移
    vec2 parallaxUV = distortedUV + (v_centered_uv * v_z * 0.1);
    float r = texture2D(u_prevFrame, parallaxUV + vec2(u_darkGlow * 0.5 + 0.003, 0.0)).r;
    float g = texture2D(u_prevFrame, parallaxUV).g;
    float b = texture2D(u_prevFrame, parallaxUV - vec2(u_darkGlow * 0.3 + 0.005, 0.0)).b;
    
    // 4. 計算水墨鈍痛感（加入 Z 軸高度的加成）
    float tension = length(distortedUV - v_uv) * u_intensity;
    // 山頂（v_z 高的地方）顏色更淡、更透；山谷更濃、更沉
    vec3 waterColor = vec3(0.7, 0.85, 0.9) * (1.0 - tension * 0.5 + v_z * 0.3);
    
    // 5. 混合邊界
    float boundary = smoothstep(0.5, 0.51, length(v_centered_uv / distortedUV) - v_z * 0.2);
    vec3 finalColor = mix(waterColor * 0.2, vec3(r, g, b) + (tension * 0.4), boundary);

    // 讓山脊線發光（像是墨水未乾的反光）
    finalColor += ridge * vec3(0.8, 0.9, 1.0) * 0.2;

    float glow = exp(-length(v_centered_uv) * 2.0);
    finalColor += glow * 0.15;
	
    vec3 past = texture2D(u_prevFrame, v_uv).rgb;
    finalColor = mix(finalColor, past, 0.2 + pow(u_speed, 3.0) * 0.2); 
	
	// 2. 製造「湍流」擾動 (這是你的空間結構)
    float noise = sin(v_uv.x * 10.0 + u_time) * cos(v_uv.y * 10.0 - u_time);
    float turbulence = v_z * 15.0 + noise * u_intensity;

    // 3. 強化版光柵 (你的柵欄玩具，這裡用 371/373)
    // 讓光柵不只是顏色，它在切開空間
    float grill = smoothstep(0.4, 0.41, fract(v_uv.x * 371.0 + v_z * 373.0)) + u_speed;
    float tear = smoothstep(0.8, 0.2, length(fwidth(v_z * 20.0)));
    grill *= tear;

    // 4. 水墨的層次：墨色深淺
    float inkStrand = fract(turbulence * 0.5);
    vec3 inkColor = mix(vec3(0.05, 0.05, 0.05), vec3(0.7, 0.7, 0.7), inkStrand * 0.3);
	
	// 1. 取得相機影像
    // 同樣使用帶有湍流和折射的座標，讓現實影像一進來就是扭曲的
    vec2 cameraUV = v_uv;
    
    // 讓相機畫面也跟隨你的 refract_logic 產生偏移
    vec2 camDistortedUV = refract_logic(v_uv, u_time, u_intensity);
    vec4 camColor = texture2D(u_camera, camDistortedUV);

    // 2. 墨化處理：將彩色相機轉為「感性灰階」或「藍調水墨」
    float camLuma = dot(camColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 inkCam = vec3(camLuma * 0.8, camLuma * 0.9, camLuma * 1.0); // 帶點深藍的灰
    
    // 3. 混合邏輯：如果開啟了相機 (u_useCamera)
    // 我們不直接覆蓋，而是讓相機成為 finalColor 的「底色」或是「光影來源」
    if(u_useCamera > 0.5) {
        // 讓相機影像影響 finalColor 的亮度，像是你的人影印在水面上
        finalColor = mix(finalColor, inkCam * finalColor * 2.0, 0.6);
    }

    // 5. 關鍵：把 finalColor 揉進波形 (Domain Remapping)
    // 我們不是直接輸出 result，而是用 turbulence 去「擾動」原本的 mixedBase
    // 這會讓 finalColor 看起來像是被湍流捲進去的絲綢
    vec2 warpUV = v_uv + vec2(sin(turbulence), cos(turbulence)) * 0.05 * u_intensity;
    vec3 warpedColor = texture2D(u_prevFrame, warpUV).rgb;
    
    // 6. 最終混合
    // 讓 warpedColor (被揉碎的色彩) 與 inkColor (墨色) 競爭
    vec3 result = mix(inkColor, finalColor * 2.5 * warpedColor, 0.5 + pow(u_speed, 3.0) * 0.2);
    
    // 壓上光柵與撕裂
    result *= (0.8 + 0.3 * grill);

    // 加上一點點因「揉捏」產生的邊緣亮光 (類似物理擠壓的邊緣)
    result += fwidth(turbulence) * 0.1 * vec3(0.5, 0.7, 0.6);

    gl_FragColor = vec4(result, 1.0);
}