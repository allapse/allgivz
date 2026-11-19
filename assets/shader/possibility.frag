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
	return signPow(0.618, -1.618 - u_intensity * 0.618);
}

float g3() {
	return signPow(0.618, 1.618 + u_complexity * 0.618);
}

void main() {
    vec2 uv = v_uv * 2.0 - 1.0;
	
	float dist = length(uv);
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	float g4 = signPow(0.618, -2.618 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + abs(uv.y) * 0.618);

    vec2 warped = uv;
    warped.x += (g3() + g2() * u_speed) * sin(local_t * 0.3 + uv.y * g4 + v_z * g2());
    warped.y += (g2() + g3() * u_complexity) * cos(local_t * 0.7 + uv.x * g1() + v_z * g3());

    float angle = atan(warped.y, warped.x);
    float radius = length(warped);

    float swirl1 = sin(radius * 11.0 * u_intensity - u_volume * g4 * u_complexity + angle * g4 * u_speed);
    float swirl2 = cos(radius * g4 * u_speed - u_volume_smooth * 11.0 * u_intensity + angle * 13.0 * u_complexity);
    float swirl = swirl1 * g2() + swirl2 * g3();

    float boundary = g2() - smoothstep(g3(), g2(), radius);

    float burst = smoothstep(g3(), g2(), pow(u_peak, g1())) * sin(u_intensity) * g5;

    float fractal1 = fract(sin(dot(warped, vec2(11.09321996,76.05078902))) * 39650.94552);
    float fractal2 = fract(sin(dot(warped * g1(), vec2(123.0595292,17.95019412))) * 15143.64772);
	float fractal3 = fract(sin(dot(warped * g4, vec2(29.04562155,76.05078902))) * 103818.9418);
    float fractal = mix(fractal1, fractal2, g2());
	fractal = mix(fractal, fractal3, g3());
	fractal = smoothstep(g3(), g2(), fractal);
	
	angle += fract(sin(dot(uv, vec2(29.04562155,46.99938762))) * 103818.9418) * g3();

    float possibility = g2() - smoothstep(0.0, g2(), radius);

    float color = swirl * boundary + burst;
    color += fractal * pow(u_speed, g1());
    color += possibility;
    color += v_z * g4;

    color = clamp(color, 0.0, g2());

    vec3 baseColor = vec3(
        g3() + g2() * sin(angle + local_t),
        g3() + g3() * cos(angle - local_t),
        g2() + g3() * sin(radius * g1() - local_t)
    );
	
	vec3 finalCol;
	vec3 past = texture2D(u_prevFrame, v_uv).rgb;
	
	float bright = g3();
	
	if(u_darkGlow > 0.618) {
		vec3 depthColor = mix(vec3(g5,g3(),g2()), vec3(g2(),g3(),g5), radius);
		finalCol = vec3(baseColor * depthColor / (color + g5));
		finalCol = mix(finalCol, past, g2() * u_speed);
		bright = g2();
	}
	else {
		vec3 nebulaColor = mix(vec3(g3(),g5,g2()), vec3(g3(),g5,g2()), fractal);
		finalCol = vec3(baseColor * nebulaColor / (color + 0.1));
		finalCol = mix(finalCol, past, g3() * u_speed);
	}

    gl_FragColor = vec4(finalCol, bright);
}

