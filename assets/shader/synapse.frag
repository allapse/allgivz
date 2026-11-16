precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume_smooth;
uniform vec2 u_orient;
uniform float u_speed;
uniform float u_intensity;
uniform float u_complexity;
uniform sampler2D u_camera;
uniform sampler2D u_prevFrame;
uniform float u_darkGlow;

varying vec2 vUv;

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

mat3 rotateY(float a){
    float c = cos(a);
    float s = sin(a);
    return mat3(
        c, 0.0, -s,
        0.0,g1(),0.0,
        s,0.0,c
    );
}
mat3 rotateX(float a){
    float c = cos(a);
    float s = sin(a);
    return mat3(
        g1(),0.0,0.0,
        0.0,c,-s,
        0.0,s,c
    );
}

float quantize(float x, float levels){
    float q = floor(x * levels) / levels;
    return q + g1()/levels;
}
vec3 quantizeVec3(vec3 v, float levels){
    return vec3(quantize(v.r, levels),
                quantize(v.g, levels),
                quantize(v.b, levels));
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
	
	float g4 = signPow(0.618, -3.0 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 3.0 + abs(uv.y) * 0.618);

    vec3 cam = texture2D(u_camera, uv).rgb;
    vec3 past = texture2D(u_prevFrame, uv).rgb;

    float baseStim = length(cam - past) * u_volume_smooth;

    float decision;

    if(u_darkGlow < 0.618){
        // 理智模式 → 局部連鎖
        float offset = g1() / min(u_res.x, u_res.y);
        float stimN = length(texture2D(u_camera, uv + vec2(0.0, offset)).rgb -
                             texture2D(u_prevFrame, uv + vec2(0.0, offset)).rgb) * u_volume_smooth;
        float stimS = length(texture2D(u_camera, uv - vec2(0.0, offset)).rgb -
                             texture2D(u_prevFrame, uv - vec2(0.0, offset)).rgb) * u_volume_smooth;
        float stimE = length(texture2D(u_camera, uv + vec2(offset, 0.0)).rgb -
                             texture2D(u_prevFrame, uv + vec2(offset, 0.0)).rgb) * u_volume_smooth;
        float stimW = length(texture2D(u_camera, uv - vec2(offset, 0.0)).rgb -
                             texture2D(u_prevFrame, uv - vec2(offset, 0.0)).rgb) * u_volume_smooth;
        decision = clamp(signPow(baseStim + g3() * (stimN+stimS+stimE+stimW), g1()), 0.0, g2());
    } else {
        // 個性模式 → 單點 + 隨機
        float change = length(cam - past); // 當前 vs 過去的差異 → 環境變化
		decision = clamp(signPow(change * u_volume_smooth * g4, g1()), 0.0, g2()); 
		// 決策值 0~1 → 哪些粒子被加強
    }

    // 粒子旋轉
    mat3 rot = rotateY(u_orient.x + u_time * 0.236) * rotateX(u_orient.y + u_time * 0.09);
    vec2 uvCentered = uv - g3();
    float angleOffset = decision * 6.856;
    vec3 particle = rot * normalize(vec3(
        uvCentered.x * cos(angleOffset) - uvCentered.y * sin(angleOffset),
        uvCentered.x * sin(angleOffset) + uvCentered.y * cos(angleOffset),
        g3()
    )) * (g2() + u_complexity * g1());

    // 顏色
    vec3 baseColor = mix(past, cam, decision);
    baseColor = quantizeVec3(baseColor, g4 * g4);
    float brightness = g3() + decision * g2();
    vec3 color = normalize(baseColor) * abs(particle) * brightness;

    gl_FragColor = vec4(color, g2());
}
