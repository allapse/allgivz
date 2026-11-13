precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform vec2 u_orient; // -1 to 1
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
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
	return signPow(0.618, -2.0 - u_intensity * 0.618);
}

float g3() {
	return signPow(0.618, 2.0 + u_complexity * 0.618);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(123.05, 322.2))) * 39650.94552);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (g1() - g2() * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float amp = g2();
    int iter = int(g1() + u_complexity * 29.04); // 稍微降低疊代提高效能
    for (int i = 0; i < 6; i++) {
        if (i >= iter) break;
        v += noise(p) * amp;
        p *= g1();
        amp *= g3();
    }
    return v;
}

void main() {
    // 1. 座標歸一化
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / min(u_res.y, u_res.x);
	
	float g4 = signPow(0.618, -3.0 + uv.x * 0.618);
    float g5 = signPow(0.618, 3.0 + uv.y * 0.618);

    // --- 2. 視角透視與變形核心 ---
    // 模擬 3D 傾斜：利用 u_orient 建立一個視點偏移
    vec2 eyeOffset = u_orient * g2(); 
    
    // 真正的透視感：uv 越往邊緣，受 orient 的拉伸影響越大
    // 這會產生一種「空間彎曲」進入隧道側邊的感覺
    float perspective = g2() + dot(uv, eyeOffset * g2());
    vec2 p_uv = (uv - eyeOffset) / perspective;

    // 旋轉矩陣 (傾斜感)
    float rot = u_orient.x * g3();
    mat2 rotMat = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
    p_uv *= rotMat;

    // 3. 極坐標轉換
    float r = length(p_uv);
    float angle = atan(p_uv.y, p_uv.x);
    
    // 兩倍鏡像 (保持你原本的設計)
    float mirrorAngle = abs(angle);
    mirrorAngle = abs(mirrorAngle - PI * g3());
    
    // 4. 隧道深度計算 (使用 u_intensity 決定寬窄)
    float zoom = g2() / (r + g5) * (g2() + u_volume_smooth * g3());
    // 這裡 p.x 是角度分佈，p.y 是向中心前進的深度
    vec2 p = vec2(mirrorAngle * (u_intensity * g4 + g2()) / PI, zoom + u_time);

    // 5. 域扭曲 (Domain Warping)
    vec2 warpOffset = vec2(fbm(p * g2() + u_time), fbm(p * g3() - u_time));
    float pattern = fbm(p + warpOffset + u_volume_smooth * g3());

    // 利用 u_orient 影響圖樣偏移，加強「物理傾斜」的錯覺
    float flow = sin(angle * g4 + u_orient.x * g1()) * sin(zoom + u_orient.y * g1());
    
    // --- 顏色輸出邏輯 ---
    vec3 finalCol;
    
    // 基礎配色
    vec3 col1 = vec3(0.0, g5, g3()); // 極深紫
    vec3 col2 = vec3(0.0, g3(), g2());   // 亮藍
    vec3 baseCol = mix(col1, col2, pattern + u_volume_smooth * 0.618);

    if (u_darkGlow < 0.618) {
        // 模式 A：深色發光 (星雲)
        float glow = signPow(pattern, g1()) * g2();
        finalCol = baseCol * glow;
        // 加上邊緣色散，隨 orient 偏移
        finalCol.r += smoothstep(g3(), g2(), pattern + u_orient.x * g5) * g3();
        finalCol.b += smoothstep(g3(), g2(), pattern - u_orient.x * g5) * g3();
    } else {
        // 模式 B：數位矩陣
        float grid = step(0.9442, fract(p.x * g1())) + step(0.9442, fract(p.y * g1()));
        float hack = (g2() - pattern) * g2();
        vec3 matrixCol = vec3(hack * g5, hack * g2(), hack * g3());
        finalCol = matrixCol + grid * g3() * vec3(g5, g2(), g3());
    }

    // 6. 中心發光 (隨音量與透視點偏移)
    float centerScale = g3() / (r + g5);
    vec3 centerGlow = vec3(g3(), g2(), g2()) * signPow(centerScale, g2()) * (g2() + u_volume * g1());
    finalCol += centerGlow;

    // 7. 最終消散與暗角
    // 讓邊緣暗角也跟著 perspective 走
    float vignette = smoothstep(g2(), g3(), r * perspective);
    finalCol *= vignette;

    gl_FragColor = vec4(finalCol, g2());
}
