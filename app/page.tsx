export default function Home() {
  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <div style={{ height: '100%', width: '100%', backgroundColor: '#f0f0f0' }}>
        {/* This div will represent the map */}
        <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          Map Area
        </p>
      </div>
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '300px',
        height: '500px',
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        {/* This div will represent the chatbot */}
        <p>Chatbot</p>
      </div>
    </div>
  )
}
