import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { apiClient } from '../api/client';
import { Product, Collection } from '../types';

interface CategoriesScreenProps {
  onCartPress: () => void;
  initialCategory?: string;
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  onCartPress,
  initialCategory,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View state: 'list' (Screen 4) or 'search_filter' (Screen 5)
  const [viewMode, setViewMode] = useState<'list' | 'search_filter'>(
    initialCategory ? 'search_filter' : 'list'
  );

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating'>('featured');

  // Selected product for modal
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [prods, cols] = await Promise.all([
          apiClient.getProducts(),
          apiClient.getCollections(),
        ]);
        setProducts(prods);
        setCollections(cols);
      } catch (e) {
        console.warn('Failed to load catalogue', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectCategory = (catTitle: string) => {
    setSelectedCategory(catTitle);
    setViewMode('search_filter');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedCategory('ALL');
    setSearchQuery('');
  };

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return collections;
    const q = categorySearch.toLowerCase().trim();
    return collections.filter((c) => c.title.toLowerCase().includes(q));
  }, [collections, categorySearch]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (selectedCategory !== 'ALL') {
      const sel = selectedCategory.toLowerCase().trim();
      result = result.filter((p) => {
        const cat = p.category.toLowerCase().trim();
        return (
          cat === sel ||
          cat.includes(sel) ||
          sel.includes(cat) ||
          p.tags.some((t) => t.toLowerCase() === sel || sel.includes(t.toLowerCase()))
        );
      });
    }

    // Search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  // SCREEN 4: CATEGORIES LIST VIEW
  if (viewMode === 'list') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.categoriesHeader}>
          <Text style={styles.categoriesHeaderTitle}>Categories</Text>
        </View>

        {/* Search Input Bar for categories */}
        <View style={styles.categorySearchBar}>
          <Ionicons name="search-outline" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.categorySearchInput}
            placeholder="Search categories..."
            placeholderTextColor="#8E8E93"
            value={categorySearch}
            onChangeText={setCategorySearch}
          />
          {categorySearch.length > 0 && (
            <TouchableOpacity onPress={() => setCategorySearch('')}>
              <Ionicons name="close-circle" size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.categoryListContent} showsVerticalScrollIndicator={false}>
          {filteredCategories.map((col) => (
            <TouchableOpacity
              key={col.id}
              style={styles.categoryRowItem}
              onPress={() => handleSelectCategory(col.title)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryRowLeft}>
                <Image source={{ uri: col.image }} style={styles.categoryThumbnail} />
                <Text style={styles.categoryRowTitle}>{col.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCREEN 5: SEARCH & FILTER (2-COLUMN PRODUCT GRID)
  return (
    <SafeAreaView style={styles.container}>
      {/* Top Search & Filter Bar */}
      <View style={styles.searchBarRow}>
        <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#111111" />
        </TouchableOpacity>

        <View style={styles.searchFilterInputBox}>
          <Ionicons name="search-outline" size={18} color="#8E8E93" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchFilterInput}
            placeholder="mirror kurta, bandi set, sherwani..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={handleBackToList} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips: Filters, Sort, Category */}
      <View style={styles.filterChipsRow}>
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => {
            const nextSort = sortBy === 'featured' ? 'price_asc' : sortBy === 'price_asc' ? 'price_desc' : sortBy === 'price_desc' ? 'rating' : 'featured';
            setSortBy(nextSort);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={14} color="#111111" style={{ marginRight: 4 }} />
          <Text style={styles.filterChipText}>Filters</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, sortBy !== 'featured' && styles.filterChipActive]}
          onPress={() => {
            const nextSort = sortBy === 'featured' ? 'price_asc' : sortBy === 'price_asc' ? 'price_desc' : sortBy === 'price_desc' ? 'rating' : 'featured';
            setSortBy(nextSort);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.filterChipText}>
            Sort {sortBy === 'price_asc' ? '↑' : sortBy === 'price_desc' ? '↓' : '▾'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedCategory !== 'ALL' && styles.filterChipActive]}
          onPress={handleBackToList}
          activeOpacity={0.8}
        >
          <Text style={styles.filterChipText}>
            Category: {selectedCategory} ▾
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsCountBar}>
        <Text style={styles.resultsCountText}>
          {filteredProducts.length} results
        </Text>
      </View>

      {/* 2-Column Product Grid matching Screen 5 */}
      <ScrollView contentContainerStyle={styles.productsScrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#111" style={{ marginTop: 40 }} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.noResultsBox}>
            <Text style={styles.noResultsTitle}>No products found</Text>
            <Text style={styles.noResultsSub}>Try adjusting your search or category filter.</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}>
              <Text style={styles.resetBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((p) => (
              <View key={p.id} style={{ width: '48%' }}>
                <ProductCard product={p} onPress={() => setActiveProduct(p)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={activeProduct}
        visible={!!activeProduct}
        onClose={() => setActiveProduct(null)}
        onCartPress={onCartPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Screen 4 Styles
  categoriesHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  categoriesHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
  },
  categorySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 8,
  },
  categorySearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
  },
  categoryListContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  categoryRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  categoryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  categoryThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  categoryRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },

  // Screen 5 Styles (Search & Filter)
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  backButton: {
    padding: 4,
  },
  searchFilterInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
  },
  searchFilterInput: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    borderColor: '#111111',
    backgroundColor: '#F5F5F5',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111111',
  },
  resultsCountBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsCountText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  productsScrollContent: {
    paddingBottom: 40,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  noResultsBox: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  noResultsSub: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: '#111111',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
