import React, { useState } from 'react';

function PropertySearch() {
  const [lastName, setLastName] = useState('');
  const [streetName, setStreetName] = useState('');
  const [cityName, setCityName] = useState('boston');
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'address', direction: 'ascending' });
  const [selectedHtml, setSelectedHtml] = useState(null);

  const handleAddressClick = (property) => {
    setSelectedHtml(property.html);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProperties([]);
    setSearched(true);

    try {
      const response = await fetch('http://localhost:5000/api/query_properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lastName, streetName, cityName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok');
      }

      const data = await response.json();
      setProperties(data.properties);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const sortedProperties = React.useMemo(() => {
    const sortableItems = [...properties];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] === null || b[sortConfig.key] === null) return 0;
        
        const comparison = String(a[sortConfig.key]).localeCompare(String(b[sortConfig.key]), undefined, { numeric: true });

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [properties, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (columnKey) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' 🔼' : ' 🔽';
    }
    return '';
  };

  const capitalize = (s) => {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div>
      
      <h2 className="page-title">Property Search</h2>
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Enter owner's last name"
        />
        <input
          type="text"
          value={streetName}
          onChange={(e) => setStreetName(e.target.value)}
          placeholder="Enter street name"
        />
        <select value={cityName} onChange={(e) => setCityName(e.target.value)}>
          <option value="all">All</option>
          <option value="boston">Boston</option>
          <option value="belmont">Belmont</option>
          <option value="somerville">Somerville</option>
          <option value="medford">Medford</option>
          <option value="lexington">Lexington</option>
          <option value="sharon">Sharon</option>
          <option value="westwood">Westwood</option>
          <option value="woburn">Woburn</option>
          <option value="watertown">Watertown</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {searched && properties.length === 0 && !loading && <p>No properties found.</p>}

      {properties.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Owner</th>
              <th onClick={() => requestSort('address')} style={{ cursor: 'pointer' }}>
                Address{getSortIndicator('address')}
              </th>
              <th>City</th>
              <th>Zip Code</th>
              <th>Land Use</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {sortedProperties.map((prop, index) => (
              <tr key={index}>
                <td>{prop.owner}</td>
                <td onClick={() => handleAddressClick(prop)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                  {prop.address}
                </td>
                <td>{capitalize(prop.city)}</td>
                <td>{prop.zipcode}</td>
                <td>{prop.landUse}</td>
                <td>{prop.totalValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedHtml && (
        <div 
          style={{ 
            padding: '10px', 
            border: '1px solid black', 
            margin: '10px 0', 
            height: '1200px', 
            overflow: 'auto',
            position: 'relative'
          }}
          dangerouslySetInnerHTML={{ __html: selectedHtml }} 
        />
      )}
    </div>
  );
}

export default PropertySearch; 