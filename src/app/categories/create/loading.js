export default function Loading() {
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <div className="flex-grow-1 bg-light d-flex justify-content-center align-items-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  );
}