precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform vec2 u_orient;      // x: 左右旋轉, y: 縮放
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

// 偽隨機函數
vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(123.05, 322.2)), dot(p, vec2(322.2, 199.13)));
    return -g2() + g1() * fract(sin(p) * 39650.94552) * u_intensity * u_complexity * u_speed * u_volume * u_peak;
}

// 梯度噪點 (Gradient Noise)
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (2.618 * g1() - 1.618 * g2() * f) * g3() ;
    return mix(mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                   dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
               mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                   dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}

// 核心：分形扭曲 (Domain Warping)
float fbm(vec2 p) {
    float v = 0.0;
    float a = g3();
    // 複雜度 (u_complexity) 決定細節層數
    int octaves = int(2.618 * g1() +  signPow(4.237 * g1(), u_complexity * g1() * 4.237)); 
    for (int i = 0; i < 7; i++) {
        if (i >= octaves) break;
        v += a * noise(p);
        p *= g1();
        a *= g3();
    }
    return v;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_res / 3.0;
    uv.x *= u_res.x / u_res.y;
	
	float g4 = signPow(0.618, -3.0 + uv.x * 0.618);
    float g5 = signPow(0.618, 3.0 + uv.y * 0.618);

    // 陀螺儀影響
    uv += u_orient * g3();

    // 領域扭曲邏輯：讓空間自己扭動
    vec2 q = vec2(0.0);
    q.x = fbm(uv + g5 * u_time);
    q.y = fbm(uv + vec2(g2()));

    vec2 r = vec2(0.0);
    // u_volume 影響扭曲的深度
    r.x = fbm(uv + g2() * q + vec2(g2(), g4) + g3() * u_time);
    r.y = fbm(uv + g2() * q + vec2(g4, g1()) + g5 * u_time);

    float f = fbm(uv + r);

    // 顏色設計
    vec3 colorA, colorB;
    
    if (u_darkGlow < 0.5) {
        // 模式 1：深淵黑金 (Dark Mode)
        colorA = vec3(g3(), g3(), g5);
        colorB = vec4(vec3(g2(), g3(), g5) * u_intensity, g2()).rgb; // 金色受重心影響
    } else {
        // 模式 2：大理石白 (Light Mode)
        colorA = vec3(0.95, 0.95, 1.0);
        colorB = vec3(0.4, 0.5, 0.6) * (1.0 - u_intensity); // 翡翠色
    }

    // 最終混合
    vec3 col = mix(colorA, colorB, clamp((f * f) * g1(), 0.0, g2()));

    // 加入 Peak 閃光：當重音來時，裂紋發光
    col += (f * f * f * g2()) * u_peak * vec3(1.0, g2(), g3());

    // 邊緣壓暗 (Vignette) 受 volume 影響
    float vgn = smoothstep(g2(), g3() - u_volume * g5, length(uv));
    col *= vgn;
	
	// 2. 處理現實世界的畫面
    vec3 sceneColor;
	// 3. 融合法則 (The Manifestation Rule)
    // 我們讓大理石的「裂縫」(f 的高值處) 透出現實世界的畫面
    vec3 marbleBase = mix(colorA, colorB, f); 
    // --- 尋找隱藏的窗格 ---
    // 使用 f 的平方來增強對比度，這會讓大理石的紋路邊界變得很清晰
    // 這就是你看到的「窗格玻璃」邊緣
    float kaleidoscopeMask = pow(f, g1()) * g2(); 
    kaleidoscopeMask = clamp(kaleidoscopeMask, 0.0, g2());
    
    // --- 2. 處理現實世界的畫面與融合 ---
    vec3 finalCol;
    
    // 找到大理石的「窗口」：讓鏡頭畫面只出現在特定紋理區域
    float mask = smoothstep(g3(), g2(), f); 

    if (u_useCamera > 0.5) {
        vec2 camUV = gl_FragCoord.xy / u_res;
        camUV.x = g2() - camUV.x; 
        
        // 1. 稍微增強折射感，讓鏡頭畫面隨大理石流動
        vec2 refractUV = camUV + r * g5 * u_volume; 
        vec3 cam = texture2D(u_camera, refractUV).rgb;
        
        // 2. 鏡頭調色：增加一點對比度，讓它在黑金/白大理石下更明顯
        vec3 sceneColor = mix(vec3(dot(cam, vec3(g3(), g3(), g5))), cam, u_intensity);

        // 3. 【關鍵修正】重新定義 Mask
        // 我們讓 f 較低的地方（也就是 colorA 的區域）透出鏡頭
        // 1.0 - f 代表選取了大理石的「空白處」
        float revealMask = smoothstep(g5, g3(), g2() - f); 

        // 4. 融合：讓大理石像雲霧一樣飄在鏡頭上面
        // 使用 Screen 或相加，讓鏡頭畫面不會被暗色完全吞掉
        vec3 marbleLayer = col; // 使用你原本計算好的 col (包含 Vignette 和 Peak)
        
        // 讓現實畫面跟大理石做「濾色」混合，這樣暗部會被大理石覆蓋，亮部會透出來
        finalCol = mix(marbleLayer, sceneColor + marbleLayer * g3(), revealMask);
        
        // 5. 加上 HUD 效果：在 Peak 時讓現實世界產生色偏或強光
        finalCol += sceneColor * u_peak * g3();
    } else {
        finalCol = col;
    }

    gl_FragColor = vec4(finalCol, g2());
}
