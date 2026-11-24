precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume_smooth;
uniform vec2 u_orient;
uniform float u_complexity;
uniform sampler2D u_camera;
uniform sampler2D u_prevFrame;
uniform float u_darkGlow;

varying vec2 vUv;

mat3 rotateY(float a){
    float c = cos(a);
    float s = sin(a);
    return mat3(
        c, 0.0, -s,
        0.0,1.0,0.0,
        s,0.0,c
    );
}
mat3 rotateX(float a){
    float c = cos(a);
    float s = sin(a);
    return mat3(
        1.0,0.0,0.0,
        0.0,c,-s,
        0.0,s,c
    );
}

float quantize(float x, float levels){
    float q = floor(x * levels) / levels;
    return q + 2.0/levels;
}
vec3 quantizeVec3(vec3 v, float levels){
    return vec3(quantize(v.r, levels),
                quantize(v.g, levels),
                quantize(v.b, levels));
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_res;

    vec3 cam = texture2D(u_camera, uv).rgb;
    vec3 past = texture2D(u_prevFrame, uv).rgb;

    float baseStim = length(cam - past) * u_volume_smooth;

    float decision;

    if(u_darkGlow < 0.5){
        // 理智模式 → 局部連鎖
        float offset = 1.0 / min(u_res.x, u_res.y);
        float stimN = length(texture2D(u_camera, uv + vec2(0.0, offset)).rgb -
                             texture2D(u_prevFrame, uv + vec2(0.0, offset)).rgb) * u_volume_smooth;
        float stimS = length(texture2D(u_camera, uv - vec2(0.0, offset)).rgb -
                             texture2D(u_prevFrame, uv - vec2(0.0, offset)).rgb) * u_volume_smooth;
        float stimE = length(texture2D(u_camera, uv + vec2(offset, 0.0)).rgb -
                             texture2D(u_prevFrame, uv + vec2(offset, 0.0)).rgb) * u_volume_smooth;
        float stimW = length(texture2D(u_camera, uv - vec2(offset, 0.0)).rgb -
                             texture2D(u_prevFrame, uv - vec2(offset, 0.0)).rgb) * u_volume_smooth;
        decision = clamp(pow(baseStim + 0.5*(stimN+stimS+stimE+stimW), 2.0), 0.0, 1.0);
    } else {
        // 個性模式 → 單點 + 隨機
        float change = length(cam - past); // 當前 vs 過去的差異 → 環境變化
		decision = clamp(pow(change * u_volume_smooth * 5.0, 2.0), 0.0, 1.0); 
		// 決策值 0~1 → 哪些粒子被加強
    }

    // 粒子旋轉
    mat3 rot = rotateY(u_orient.x + u_time*0.2) * rotateX(u_orient.y + u_time*0.1);
    vec2 uvCentered = uv - 0.5;
    float angleOffset = decision * 6.2831;
    vec3 particle = rot * normalize(vec3(
        uvCentered.x * cos(angleOffset) - uvCentered.y * sin(angleOffset),
        uvCentered.x * sin(angleOffset) + uvCentered.y * cos(angleOffset),
        1.0
    )) * (0.5 + u_complexity*0.5);

    // 顏色
    vec3 baseColor = mix(past, cam, decision);
    baseColor = quantizeVec3(baseColor, 16.0);
    float brightness = 0.5 + decision * 0.5;
    vec3 color = normalize(baseColor) * abs(particle) * brightness;

    gl_FragColor = vec4(color,1.0);
}
