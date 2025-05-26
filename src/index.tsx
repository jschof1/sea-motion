import React, { useRef, useEffect, useState, useCallback } from 'react';

interface SeaMotionProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  speed?: number;
  intensity?: number;
  children?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const SeaMotion: React.FC<SeaMotionProps> = ({
  src,
  alt = '',
  className = '',
  style = {},
  speed = 0.3,
  intensity = 1.0,
  children,
  onLoad,
  onError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float u_time;
    uniform float u_speed;
    uniform float u_intensity;
    uniform vec2 u_resolution;
    varying vec2 v_texCoord;
    
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float smoothNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      for(int i = 0; i < 4; i++) {
        value += amplitude * smoothNoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }
    
    void main() {
      vec2 uv = v_texCoord;
      float time = u_time * u_speed * 0.0003;
      
      float wave1 = sin(uv.x * 6.0 + time * 0.8) * 0.02 * u_intensity;
      float wave2 = sin(uv.y * 4.0 + time * 0.6) * 0.015 * u_intensity;
      float wave3 = sin((uv.x + uv.y) * 8.0 + time * 1.2) * 0.01 * u_intensity;
      
      vec2 noisePos = uv * 3.0 + time * 0.2;
      float turbulence = fbm(noisePos) * 0.03 * u_intensity;
      
      vec2 center = vec2(0.5, 0.5);
      float dist = length(uv - center);
      float ripple = sin(dist * 20.0 - time * 1.5) * 0.008 * (1.0 - dist) * u_intensity;
      
      vec2 distortion = vec2(
        wave1 + wave3 + turbulence + ripple,
        wave2 + wave3 + turbulence * 0.7 + ripple
      );
      
      vec2 distortedUV = uv + distortion;
      vec4 color = texture2D(u_texture, distortedUV);
      
      color.rgb += sin(time + uv.x * 10.0) * 0.05 * u_intensity;
      color.rgb *= 1.0 + sin(time * 0.8 + dist * 15.0) * 0.1 * u_intensity;
      
      gl_FragColor = color;
    }
  `;

  const createShader = useCallback((gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${error}`);
    }
    
    return shader;
  }, []);

  const createProgram = useCallback((gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program linking error: ${error}`);
    }
    
    return program;
  }, []);

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl');
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    glRef.current = gl;
    
    try {
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      
      if (!vertexShader || !fragmentShader) {
        throw new Error('Failed to create shaders');
      }
      
      const program = createProgram(gl, vertexShader, fragmentShader);
      if (!program) {
        throw new Error('Failed to create program');
      }
      
      programRef.current = program;
      
      const positions = new Float32Array([
        -1, -1,  0, 1,
         1, -1,  1, 1,
        -1,  1,  0, 0,
         1,  1,  1, 0
      ]);
      
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      
      const positionLocation = gl.getAttribLocation(program, 'a_position');
      const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
      
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
      
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
      
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      
    } catch (err) {
      throw err;
    }
  }, [createShader, createProgram]);

  const loadImage = useCallback((imageSrc: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSrc;
    });
  }, []);

  const createTexture = useCallback((image: HTMLImageElement) => {
    const gl = glRef.current;
    if (!gl) return null;
    
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    return texture;
  }, []);

  const resizeCanvas = useCallback((image: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const gl = glRef.current;
    
    if (!canvas || !container || !gl) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    let width = image.width;
    let height = image.height;
    
    // Scale to fit container while maintaining aspect ratio
    const scaleX = containerWidth / width;
    const scaleY = containerHeight / height;
    const scale = Math.min(scaleX, scaleY);
    
    width *= scale;
    height *= scale;
    
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    gl.viewport(0, 0, width, height);
  }, []);

  const render = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const texture = textureRef.current;
    const canvas = canvasRef.current;
    
    if (!gl || !program || !texture || !canvas) return;
    
    const currentTime = Date.now() - startTimeRef.current;
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    const textureLocation = gl.getUniformLocation(program, 'u_texture');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const speedLocation = gl.getUniformLocation(program, 'u_speed');
    const intensityLocation = gl.getUniformLocation(program, 'u_intensity');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    
    gl.uniform1i(textureLocation, 0);
    gl.uniform1f(timeLocation, currentTime);
    gl.uniform1f(speedLocation, speed);
    gl.uniform1f(intensityLocation, intensity);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    animationRef.current = requestAnimationFrame(render);
  }, [speed, intensity]);

  const initializeEffect = useCallback(async (imageSrc: string) => {
    try {
      setError(null);
      
      initWebGL();
      const image = await loadImage(imageSrc);
      
      resizeCanvas(image);
      const texture = createTexture(image);
      
      if (!texture) {
        throw new Error('Failed to create texture');
      }
      
      textureRef.current = texture;
      startTimeRef.current = Date.now();
      
      setIsLoaded(true);
      onLoad?.();
      
      // Start animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      render();
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error.message);
      onError?.(error);
    }
  }, [initWebGL, loadImage, resizeCanvas, createTexture, onLoad, onError, render]);

  useEffect(() => {
    if (src) {
      initializeEffect(src);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [src, initializeEffect]);

  useEffect(() => {
    // Restart animation when speed or intensity changes
    if (isLoaded && textureRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      render();
    }
  }, [speed, intensity, isLoaded, render]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    ...style
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    height: 'auto'
  };

  if (error) {
    return (
      <div className={className} style={containerStyle}>
        <div style={{ color: 'red', padding: '20px' }}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        aria-label={alt}
      />
      {children}
    </div>
  );
};

export default SeaMotion; 