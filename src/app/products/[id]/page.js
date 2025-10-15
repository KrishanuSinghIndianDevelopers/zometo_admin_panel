'use client';

import { useParams, useRouter } from 'next/navigation';

export default function ViewProduct() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  return (
    <div className="min-vh-100 bg-light p-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <button 
          onClick={() => router.back()}
          className="btn btn-secondary"
        >
          Back
        </button>
        <h1 className="fw-bold text-dark mb-0">Product Details</h1>
      </div>
      
      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="h4 mb-4">Product ID: {id}</h2>
          <div className="row">
            <div className="col-md-6">
              <p><strong>Name:</strong> Sample Product</p>
              <p><strong>Price:</strong> $99.99</p>
            </div>
            <div className="col-md-6">
              <p><strong>Category:</strong> Electronics</p>
              <p><strong>Status:</strong> Active</p>
            </div>
          </div>
          <p><strong>Description:</strong> This is a sample product description.</p>
        </div>
      </div>
    </div>
  );
}