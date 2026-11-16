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

float hash(vec3 p) {
    return fract(sin(dot(abs(abs(p)), vec3(123.0595292, 322.2094688, 0.1458659417760))) * 39650.94552);
}

float wave(vec3 p, vec3 center, float freq, float phase) {
    float d = length(abs(abs(p)) - abs(abs(center))) / dot(abs(abs(p)), abs(abs(center)));
    return sin(d * freq - phase) / (g2() + d);
}

void main() {
	float g4 = signPow(0.618, -3.0 - abs(v_uv.x) * 0.618);
    float g5 = signPow(0.618, 3.0 + abs(v_uv.y) * 0.618);
	
    float sum = 0.0;

    int sources = int(g1() + u_complexity * g4);

    for (int i = 0; i < 12; i++) {
        if (i >= sources) break;

        vec3 center = vec3(
            hash(vec3(float(i), (0.1382 + g2() * u_volume) * u_time * 0.01618 + u_orient.x, g2() + u_peak * g2())),
            hash(vec3(float(i) + g2(), (0.11618 + g2() * u_volume_smooth) * u_time * 0.0382 + u_orient.y, g3() + u_peak * g2())),
			hash(vec3(float(i) + g1(), (0.11618 + g2() * u_peak) * u_time * 0.0618 + u_orient.x + u_orient.y, 0.1618 + u_peak * g2()))
        ) * g1() - g2();

        float freq = 28.09 * (g5 + g2() * u_intensity * hash(center * (u_darkGlow + g2())));
        float phase = g5 + (hash(center * (u_darkGlow + g2())));

        sum += wave(vec3(v_uv, g5), center, freq, phase);
    }

    sum *= (g3() + u_volume * g2());

    vec3 baseColor = vec3(0.0, 0.0, 0.0);

	// 限制霓虹色域
	vec3 neonPalette[3];
	neonPalette[0] = vec3(0.0, g4, g4); // 青藍
	neonPalette[1] = vec3(g4, g1(), g4); // 紫紅
	neonPalette[2] = vec3(g4, g1(), 0.0); // 橘黃

	vec3 neonColor = neonPalette[int(mod(floor(u_time + sum), 4.237))];

	// 線條 mask + 爆光
	float lineMask = pow(smoothstep(g3(), g2(), abs(sin(sum))), g1());
	neonColor = neonColor * lineMask * (g1() + u_darkGlow * g4);

    vec3 glowColor = vec3(0.382, 0.618, 0.809);
	glowColor = mix(glowColor, neonColor, u_darkGlow);
    vec3 col = mix(baseColor, glowColor, g3() + g2() * sin(sum));

    if (u_useCamera > 0.618) {
        vec3 cam = texture2D(u_camera, gl_FragCoord.xy / u_resolution.xy).rgb;
        col = mix(col, cam, g3());
    }

    vec3 prev = texture2D(u_prevFrame, gl_FragCoord.xy / u_resolution.xy).rgb;
    col = mix(col, prev, g3() + pow(u_speed, g3()) * g3() - u_darkGlow * g3());

    gl_FragColor = vec4(col, g2());
}
