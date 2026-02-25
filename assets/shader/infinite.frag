uniform vec2 u_resolution;

uniform vec2 u_orient;
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

varying vec2 v_uv;
varying float v_z;

float hash(vec3 p) {
    return fract(sin(dot(abs(abs(p)), vec3(128.8, 311.8, 0.18))) * 43758.5453128);
}

float wave(vec3 p, vec3 center, float freq, float phase) {
    float d = length(abs(abs(p)) - abs(abs(center))) / dot(abs(abs(p)), abs(abs(center)));
    return sin(d * freq - phase) / (1.0 + d);
}

void main() {
    vec2 uv = v_uv;
    uv = uv * 2.0 - 1.0;

    float sum = 0.0;

    int sources = int(3.0 + u_complexity * 5.0);

    for (int i = 0; i < 12; i++) {
        if (i >= sources) break;

        vec3 center = vec3(
            hash(vec3(float(i), (0.12 + 0.88 * u_volume) * u_time * 0.02 + u_orient.x, 0.5 + u_peak * 0.5)),
            hash(vec3(float(i) + 2.0, (0.12 + 0.88 * u_volume_smooth) * u_time * 0.03 + u_orient.y, 0.3 + u_peak * 0.7)),
			hash(vec3(float(i) + 3.0, (0.12 + 0.88 * u_peak) * u_time * 0.05 + u_orient.x + u_orient.y, 0.2 + u_peak * 0.8))
        ) * 2.0 - 1.0;

        float freq = 28.0 * (0.02 + 0.98 * u_intensity * hash(center * (u_darkGlow + 0.8)));
        float phase = 0.2 + (hash(center * (u_darkGlow + 0.8)));

        sum += wave(vec3(uv, 0.0), center, freq, phase);
    }

    sum *= (0.5 + u_volume * 0.8);

    vec3 baseColor = vec3(0.0, 0.0, 0.0);

	// 限制霓虹色域
	vec3 neonPalette[3];
	neonPalette[0] = vec3(0.0, 0.8, 0.8); // 青藍
	neonPalette[1] = vec3(0.8, 0.2, 0.8); // 紫紅
	neonPalette[2] = vec3(0.8, 0.5, 0.0); // 橘黃

	vec3 neonColor = neonPalette[int(mod(floor(u_time + sum), 3.0))];

	// 線條 mask + 爆光
	float lineMask = pow(smoothstep(0.3, 0.8, abs(sin(sum))), 2.0);
	neonColor = neonColor * lineMask * (1.0 + u_darkGlow * 2.0);

    vec3 glowColor = vec3(0.58, 0.68, 0.78);
	glowColor = mix(glowColor, neonColor, u_darkGlow);
    vec3 col = mix(baseColor, glowColor, 0.2 + 0.58 * sin(sum));

    if (u_useCamera > 0.58) {
        vec3 cam = texture2D(u_camera, gl_FragCoord.xy / u_resolution.xy).rgb;
        col = mix(col, cam, 0.3);
    }

    vec3 prev = texture2D(u_prevFrame, gl_FragCoord.xy / u_resolution.xy).rgb;
    col = mix(col, prev, 0.28 + pow(u_speed, 0.3) * 0.28 - u_darkGlow * 0.28);

    gl_FragColor = vec4(col, 1.0);
}
