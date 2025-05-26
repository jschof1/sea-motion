# React Sea Motion 🌊

A React component that adds fluid, sea-like motion effects to images using WebGL shaders.

## Installation

```bash
npm install react-sea-motion
```

## Usage

### Basic Usage
```jsx
import SeaMotion from 'react-sea-motion';

function App() {
  return (
    <SeaMotion 
      src="/path/to/your/image.jpg" 
      alt="Beautiful image with sea motion effect"
    />
  );
}
```

### Advanced Usage
```jsx
import SeaMotion from 'react-sea-motion';

function App() {
  return (
    <SeaMotion 
      src="/path/to/your/image.jpg"
      alt="Custom sea motion"
      speed={0.5}        // Animation speed (0.1 - 2.0)
      intensity={1.2}    // Effect intensity (0.1 - 3.0)
      className="my-sea-motion"
      style={{ 
        width: '400px', 
        height: '300px',
        borderRadius: '10px'
      }}
      onLoad={() => console.log('Effect loaded!')}
      onError={(error) => console.error('Error:', error)}
    >
      {/* Optional overlay content */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'white',
        fontSize: '24px'
      }}>
        Overlay Text
      </div>
    </SeaMotion>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | - | Image source URL |
| `alt` | `string` | `''` | Alt text for accessibility |
| `className` | `string` | `''` | CSS class name |
| `style` | `CSSProperties` | `{}` | Inline styles |
| `speed` | `number` | `0.3` | Animation speed (0.1 - 2.0) |
| `intensity` | `number` | `1.0` | Effect intensity (0.1 - 3.0) |
| `children` | `ReactNode` | - | Optional overlay content |
| `onLoad` | `function` | - | Callback when effect loads |
| `onError` | `function` | - | Callback when error occurs |

## Features

- 🌊 **Realistic sea motion** - Multiple wave layers with fractal noise
- ⚡ **WebGL powered** - Smooth 60fps animations using GPU acceleration
- 🎛️ **Customizable** - Adjustable speed and intensity
- 📱 **Responsive** - Automatically scales to container size
- 🔧 **TypeScript** - Full TypeScript support included
- 🎨 **Overlay support** - Add content on top of the effect

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support
- IE11: ❌ Not supported (requires WebGL)

## License

MIT 