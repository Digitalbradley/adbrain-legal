import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

const AdBrainPreview = ({ csvData, onSort }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // If no data, show placeholder
  if (!csvData || csvData.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        Upload a CSV file to preview your data
      </div>
    );
  }

  // Get headers from first row
  const headers = Object.keys(csvData[0]);

  // Filter data based on search
  const filteredData = csvData.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <div className="flex flex-col w-full h-full bg-gray-50 rounded-lg">
      {/* Search bar */}
      <div className="p-4 bg-white border-b rounded-t-lg">
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => {
                    const direction = sortConfig.key === header && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfig({ key: header, direction });
                    onSort?.(header, direction);
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span>{header}</span>
                    {sortConfig.key === header && (
                      sortConfig.direction === 'asc' ?
                        <ChevronUp className="h-4 w-4" /> :
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {headers.map((header, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 bg-white border-t rounded-b-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} entries
          </span>
          <div className="flex space-x-2">
            <button
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdBrainPreview;