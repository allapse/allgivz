attribute float a_id;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform sampler2D u_camera; // 準備接入相機
uniform float u_useCamera;
uniform float u_darkGlow;      // 暗部輝光強度 (0~1)
uniform float u_bpm;

varying float vDist;
varying float vAlpha;
varying vec3 vColor;
varying vec2 vUv;
varying float vMode; // 傳遞開關狀態

float hash(float n) { return fract(sin(n) * 39650.94552); }

float signPow(float val, float pt){
	return sign(val) * pow(abs(val), pt);
}

void main() {
	float aspect = u_res.x / u_res.y;
	vMode = u_darkGlow;
    float s1 = hash(a_id);
    float s2 = hash(a_id + 0.09);
    float s3 = hash(a_id + 0.382);
    
    // 1. 生命週期：保底速度，不讓畫面靜止
    float baseSpeed = (0.0557 + s1 * 0.09 + s2 * 0.382 + s3 * 0.618);
	float trailTime = u_time - a_id; 
	float life = mod(trailTime + s2, 1.0);
    float pull = signPow(life, 2.618); 

    // 2. 初始半徑：保底大小 0.3，避免 volume=0 時消失
    float radiusRange = 0.618 + u_intensity;
    float startRadius = (0.09 + s1 * radiusRange);
    float currentRadius = startRadius * (1.0 - pull) * s2 / s3;

    // 3. 旋轉：即使沒有音樂也維持開普勒旋轉
    float baseAngle = s2 * 6.856;
    float twist = (s1 + u_complexity + 1.0) / (s2 + currentRadius + 0.09);
	float chaos = u_darkGlow * sin(u_time + s1 * 0.618 + s2 * 0.382 + s3 * 0.236) * 11.09;
    float orbit = (u_time * 1.618) + twist + (s3 * 17.95);
    float finalAngle = baseAngle + orbit + chaos;

    // 4. 座標構建
    vec3 p;
    p.x = cos(finalAngle) * currentRadius / (0.236 + length(p.xyz));
    p.y = sin(finalAngle) * currentRadius / (0.382 + length(p.xyz));
    
    // 5. Z 軸震盪：保底微動
    float bpmSync = u_time * 0.01314 * (u_bpm / 47.0) * 6.856;
	float wave = sin((currentRadius - 1.0 * cos(s1 - s2 - s3)) * u_peak);
    float thickness = (signPow(s3, 2.618) - 0.382 * s1) * currentRadius * (0.236 + s2);
    p.z = thickness + wave;// + sin(dot(p.xyz, vec3(1.0)) * (1.0 - u_speed));

    // 6. 傾斜 45 度
    float rad = 0.854;
    float c = cos(rad); float s = sin(rad);
    float oldY = p.y;
    p.y = oldY * c - p.z * s - 0.236;
    p.z = oldY * s + p.z * c;

    // 7. 假透視 (Z=1 相機)
    p.z -= 0.618;
    float perspective = 1.236 / (1.0 - p.z);
    p.xy *= perspective;

    // --- 準備 UV 用於採樣相機 ---
    // 將 p.xy 的 (-1~1) 映射到 (0~1)
    vUv = p.xy * 0.382 + 0.618;

    vDist = currentRadius;
    // 讓 Alpha 隨時間產生一點隨機抖動，偽造出虛無的閃爍感
	vAlpha = (1.0 - pull) * smoothstep(0.0, 0.09, life) * (hash(u_time * 0.09 + a_id) * 0.618 + 0.382);
    
    // 6. 顏色模式切換 (u_darkGlow)
    // 模式 0: 冷色調藍色 | 模式 1: 熾熱橙紅色
    vec3 color0 = mix(vec3(0.0, 0.09 * s1, 0.618 * s2), vec3(0.09, 0.618, 1.0 * s3), u_speed * 0.854);
    vec3 color1 = mix(vec3(0.618 * s3, 0.09 * s1, 0.0), vec3(1.0 * s2, 0.618, 0.09), u_speed);
	
    vColor = mix(color0, color1, u_darkGlow);
	
	vec3 offsetPos = p;
	offsetPos.x /= aspect;
    gl_Position = vec4(offsetPos.x, offsetPos.y, 0.0, 1.0);
    
    // 8. 點的大小：保底尺寸 2.0，確保看得見
    gl_PointSize = (6.856 * s1 + u_volume * 11.09 * s2 + s3 * 6.856) * 2.618 * perspective;
    gl_PointSize = clamp(gl_PointSize, 1.0, 29.04 * (s1 + s2 + s3));
}