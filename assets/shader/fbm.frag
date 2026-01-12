precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform vec2 u_orient;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform float u_darkGlow;

#define PI 3.14159265359

// 偽隨機函數：生成雜訊的基礎
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 簡單雜訊 (Value Noise)
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 分形布朗運動 (FBM)：增加複雜度層次
float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    // u_complexity 決定疊代的細節量
    int iter = int(3.0 + u_complexity * 17.0);
    for (int i = 0; i < 8; i++) {
        if (i >= iter) break;
        v += noise(p) * amp;
        p *= 2.1;
        amp *= 0.5;
    }
    return v;
}

void main() {
    // 1. 座標歸一化與視角修正
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / min(u_res.y, u_res.x);
    vec2 look = (u_orient);
	vec2 targetLook = u_orient * 0.4;
    
    // 2. 極坐標轉換
    float rot = u_orient.x * 0.2;
    mat2 rotMat = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
    vec2 p_uv = uv * rotMat - targetLook;

    float r = length(p_uv);
    float angle = atan(p_uv.y, p_uv.x);
    
    // 兩倍鏡像
    float mirrorAngle = abs(angle);
    mirrorAngle = abs(mirrorAngle - PI * 0.5);
    
    // 3. 空間扭曲 (Space Warping)
    // 深度計算加入音量影響，產生震盪感
    float zoom = 1.0 / (r + 0.01) * (1.0 + u_volume_smooth * 0.5);
    vec2 p = vec2(mirrorAngle * (u_intensity * 5.0 + 2.0) / 6.28, zoom + u_time * u_speed);

    // 4. 域扭曲 (Domain Warping) - 這是產生「複雜感」的關鍵
    // 公式：g(p) = fbm( p + fbm( p ) )
    vec2 offset = vec2(fbm(p + u_time * 0.1), fbm(p - u_time * 0.1));
    float pattern = fbm(p + offset + u_volume_smooth);

    // 3. 深度與速度耦合
    float depth = 1.0 / (r + 0.01);
    float forward = depth + u_time * (u_speed * 10.0 + 5.0);

    // 4. 利用 u_orient 影響花紋的「流向」
    // 當手機側翻時，花紋會往傾斜方向「墜落」
    float pattern2 = sin(angle * 6.0 + u_orient.x * 2.0) * sin(forward + u_orient.y);
    
    // --- 顏色輸出與色散 ---
    // 側翻越重，顏色層次越豐富
    vec3 col;
    col.r = smoothstep(0.4, 0.6, pattern2 + u_orient.x * 0.1);
    col.g = smoothstep(0.4, 0.6, pattern2);
    col.b = smoothstep(0.4, 0.6, pattern2 - u_orient.x * 0.1);

    // 結合 baseCol 與音量
    vec3 baseCol = mix(vec3(0.1, 0.2, 0.5), vec3(0.7, 0.1, 0.4), u_volume_smooth);
    vec3 finalCol = col * baseCol * (1.0 + u_volume_smooth);

    // 邊緣光暈處理
    finalCol += (vec3(0.3, 0.6, 1.0) * 0.2) / (r + 0.1);
    
    // 基礎色調：根據深度與音量變化
    vec3 col1 = vec3(0.1, 0.05, 0.2); // 深紫
    vec3 col2 = vec3(0.0, 0.8, 1.0); // 電光藍
    vec3 baseCol2 = mix(col1, col2, pattern + u_volume_smooth);

    if (u_darkGlow > 0.5) {
        // 模式 A：星雲/黑洞模式
        float glow = pow(pattern, 3.0) * 2.0;
        finalCol = baseCol2 * glow;
        finalCol += vec3(0.5, 0.2, 0.8) * (1.0 - r); // 邊緣色彩滲透
    } else {
        // 模式 B：數位/矩陣模式 (駭客綠升級版)
        float scanline = sin(gl_FragCoord.y * 2.0 + u_time * 20.0) * 0.1;
        float grid = step(0.9, fract(p.x * 10.0)) + step(0.9, fract(p.y * 10.0));
        float hack = (1.0 - pattern) * 1.5;
        finalCol = vec3(hack * 0.1, hack, hack * 0.4) + grid * 0.2 + scanline;
    }

    // 6. 中心發光與邊緣壓暗
    float center = pow(0.05 / (r + 0.01), 1.5) * (1.0 + u_volume * 2.0);
    finalCol += vec3(0.8, 0.9, 1.0) * center;
    finalCol *= smoothstep(1.5, 0.2, r); // Vignette

    gl_FragColor = vec4(finalCol, 1.0);
}