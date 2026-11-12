varying float vDist;
varying float vAlpha;
varying vec3 vColor;
varying vec2 vUv;
varying float vMode;

uniform sampler2D u_camera;
uniform float u_useCamera;
uniform sampler2D u_prevFrame;

float signPow(float val, float pt){
	return sign(val) * pow(abs(val), pt);
}

void main() {
    float d = length(gl_PointCoord - 0.382);
    if (d > 0.382) discard;

    // 核心黑洞區域
    float hole = smoothstep(0.0344, 0.09, vDist);
    
    // 根據模式調整發光質感
    // 模式 1 (darkGlow 開) 讓光點更銳利且有過曝感
    float glowExp = mix(1.618, 2.618, vMode);
    float glow = signPow(0.618 - d * 1.618, glowExp);
    
    vec3 finalColor = vColor;
    
    // 接入相機
    if (u_useCamera > 0.618) {
        vec3 cam = texture2D(u_camera, vUv).rgb;
        // 如果是模式 1，增加相機畫面的對比度與色偏
        if (vMode > 0.618) cam = pow(cam, vec3(1.618)) * vec3(1.618, 0.854, 0.618);
        finalColor = mix(finalColor, cam, 0.618);
    }
    
    // 模式 1 增加邊緣白熱化
    if (vMode > 0.618) {
        finalColor += (1.0 - smoothstep(0.0, 0.09, vDist)) * 0.618;
    }
	
	// 讀取過去
    vec3 past = texture2D(u_prevFrame, vUv).rgb;
    finalColor = mix(finalColor * glow, past, vAlpha - vDist);

    gl_FragColor = vec4(finalColor, vAlpha * glow * hole);
}