from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.models.schemas import Product, Collection
from app.services.catalog_service import catalog_service

router = APIRouter(tags=["Catalogue"])

@router.get("/products", response_model=List[Product])
def list_products(
    category: Optional[str] = Query(None, description="Filter by category name"),
    query: Optional[str] = Query(None, description="Search term for title or tags"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    sort_by: Optional[str] = Query(
        None, description="Sort order: price_asc, price_desc, newest, rating"
    ),
):
    """Retrieve catalog products with optional filtering and sorting."""
    return catalog_service.get_products(
        category=category,
        query=query,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
    )

@router.get("/products/{product_id}", response_model=Product)
def get_product(product_id: str):
    """Retrieve single product details and available variants."""
    product = catalog_service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found.")
    return product

@router.get("/collections", response_model=List[Collection])
def list_collections():
    """Retrieve all featured collections and product categories."""
    return catalog_service.get_collections()

@router.get("/search", response_model=List[Product])
def search_products(q: str = Query(..., min_length=1, description="Search query")):
    """Quick search endpoint across product titles, descriptions, and tags."""
    return catalog_service.get_products(query=q)
