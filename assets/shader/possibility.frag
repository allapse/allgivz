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

void main() {
    vec2 uv = v_uv * 2.0 - 1.0;
    float t = u_time;

    vec2 warped = uv;
    warped.x += (0.3 + 0.5 * u_speed) * sin(t * 0.3 + uv.y * 5.0 + v_z * 0.7);
    warped.y += (0.5 + 0.3 * u_complexity) * cos(t * 0.7 + uv.x * 3.0 + v_z * 0.5);

    float angle = atan(warped.y, warped.x);
    float radius = length(warped);

    float swirl1 = sin(radius * 11.0 * u_intensity - u_volume * 7.0 * u_complexity + angle * 5.0 * u_speed);
    float swirl2 = cos(radius * 7.0 * u_speed - u_volume_smooth * 11.0 * u_intensity + angle * 13.0 * u_complexity);
    float swirl = swirl1 * 0.7 + swirl2 * 0.3;

    float boundary = 1.0 - smoothstep(0.3, 0.7, radius);

    float burst = smoothstep(0.3, 0.7, pow(u_peak, 3.0)) * sin(u_intensity) * 0.2;

    float fractal1 = fract(sin(dot(warped, vec2(12.9898,78.233))) * 43758.5453);
    float fractal2 = fract(sin(dot(warped*2.0, vec2(93.9898,18.233))) * 12758.5453);
	float fractal3 = fract(sin(dot(warped*3.0, vec2(33.3,71.7))) * 98765.4321);
    float fractal = mix(fractal1, fractal2, 0.5);
	fractal = mix(fractal, fractal3, 0.3);
	fractal = smoothstep(0.2, 0.7, fractal);
	
	angle += fract(sin(dot(uv, vec2(21.1,47.3))) * 12345.678) * 0.5;

    float possibility = 1.0 - smoothstep(0.0, 1.0, radius);

    float color = swirl * boundary + burst;
    color += fractal * pow(u_speed, 2.0);
    color += possibility;
    color += v_z * 2.8;

    color = clamp(color, 0.0, 1.0);

    vec3 baseColor = vec3(
        0.3 + 0.7 * sin(angle + t),
        0.5 + 0.5 * cos(angle - t),
        0.7 + 0.3 * sin(radius * 2.0 - t)
    );
	
	vec3 finalCol;
	vec3 past = texture2D(u_prevFrame, v_uv).rgb;
	
	float bright = 0.7;
	
	if(u_darkGlow > 0.5) {
		vec3 depthColor = mix(vec3(0.1,0.3,0.5), vec3(0.7,0.5,0.3), radius);
		finalCol = vec3(baseColor * depthColor / (color + 0.1));
		finalCol = mix(finalCol, past, 0.7 + 0.29 * u_speed);
		bright = 1.0;
	}
	else {
		vec3 nebulaColor = mix(vec3(0.3,0.1,0.5), vec3(0.5,0.3,0.7), fractal);
		finalCol = vec3(baseColor * nebulaColor / (color + 0.1));
		finalCol = mix(finalCol, past, 0.3 * u_speed);
	}

    gl_FragColor = vec4(finalCol, bright);
}

