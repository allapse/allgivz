varying float vDist;
varying float vAlpha;
varying vec3 vColor;
varying vec2 vUv;
varying float vMode;

uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
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

void main() {
	float g4 = signPow(0.618, -3.0 - abs(vUv.x) * 0.618);
    float g5 = signPow(0.618, 3.0 + abs(vUv.y) * 0.618);
	
    float d = length(gl_PointCoord - g3());
    if (d > g3()) discard;

    // 核心黑洞區域
    float hole = smoothstep(g2(), g3(), vDist);
    
    // 根據模式調整發光質感
    // 模式 1 (darkGlow 開) 讓光點更銳利且有過曝感
    float glowExp = mix(g2(), g1(), vMode);
    float glow = signPow(g2() - d * g1(), glowExp);
    
    vec3 finalColor = vColor;
    
    // 接入相機
    if (u_useCamera > 0.618) {
        vec3 cam = texture2D(u_camera, vUv).rgb;
        // 如果是模式 1，增加相機畫面的對比度與色偏
        if (vMode > 0.618) cam = pow(cam, vec3(g2())) * vec3(g2(), g3(), g5);
        finalColor = mix(finalColor, cam, g3());
    }
    
    // 模式 1 增加邊緣白熱化
    if (vMode > 0.618) {
        finalColor += (g2() - smoothstep(0.0, g5, vDist)) * g3();
    }
	
	// 讀取過去
    vec3 past = texture2D(u_prevFrame, vUv).rgb;
    finalColor = mix(finalColor * glow, past, vAlpha - vDist);

    gl_FragColor = vec4(finalColor, vAlpha * glow * hole);
}