precision highp float;

uniform sampler2D u_camera;
uniform float u_useCamera;
uniform vec2 u_res; // 建議加上，用來計算相機座標

void main() {
    // 1. 初始化 vec3 必須使用 vec3() 構造函數，不能只用括號
    vec3 finalCol = vec3(0.0, 0.0, 0.0);

    if (u_useCamera > 0.5) {
        // 2. 取得當前像素在畫面上的比例座標 (0.0 到 1.0)
        vec2 uv = gl_FragCoord.xy / u_res;
        
        // 3. sampler2D 不能直接賦值給 vec3，必須使用 texture2D 函數讀取像素
        finalCol = texture2D(u_camera, uv).rgb;
    }
    // else 分支可以省略，因為前面已經初始化為 vec3(0.0)

    // 輸出最終顏色
    gl_FragColor = vec4(finalCol, 1.0);
}