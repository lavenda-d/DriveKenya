import React from 'react';
import { Download, FileText, Table, BarChart } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DataExport = ({ data, type, filename }) => {
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportToPDF = async (elementId, filename) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        console.error('Element not found for PDF export');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
      
      const imgWidth = 280;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      // Add title
      pdf.setFontSize(16);
      pdf.text(`${filename} Report`, 20, position);
      position += 20;

      // Add image
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - position;

      // Add new pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  };

  const exportUserData = () => {
    const userData = data.map(user => ({
      'Full Name': `${user.first_name} ${user.last_name}`,
      'Email': user.email,
      'Role': user.role,
      'Status': user.email_verified ? 'Verified' : 'Pending',
      'Join Date': new Date(user.created_at).toLocaleDateString(),
      'Last Login': user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'
    }));
    
    exportToCSV(userData, filename || 'users_report');
  };

  const exportBookingData = () => {
    const bookingData = data.map(booking => ({
      'Booking ID': booking.id,
      'Customer': booking.customer_name,
      'Car': booking.car_details,
      'Start Date': new Date(booking.start_date).toLocaleDateString(),
      'End Date': new Date(booking.end_date).toLocaleDateString(),
      'Total Price': `$${booking.total_price}`,
      'Status': booking.status,
      'Created': new Date(booking.created_at).toLocaleDateString()
    }));
    
    exportToCSV(bookingData, filename || 'bookings_report');
  };

  const exportCarData = () => {
    const carData = data.map(car => ({
      'Car ID': car.id,
      'Make & Model': `${car.make} ${car.model}`,
      'Year': car.year,
      'License Plate': car.license_plate,
      'Daily Rate': `$${car.price_per_day}`,
      'Location': car.location,
      'Status': car.status,
      'Available': car.available ? 'Yes' : 'No',
      'Owner': car.owner_name,
      'Created': new Date(car.created_at).toLocaleDateString()
    }));
    
    exportToCSV(carData, filename || 'cars_report');
  };

  const exportRevenueData = () => {
    const revenueData = data.map(item => ({
      'Period': item.month || item.period,
      'Gross Revenue': `$${item.revenue || item.gross}`,
      'Platform Fees': `$${item.fees || item.platform_fees || 0}`,
      'Net Revenue': `$${item.net_revenue || item.net || (item.revenue - (item.fees || 0))}`,
      'Bookings Count': item.bookings || item.booking_count || 0,
      'Average per Booking': `$${((item.revenue || 0) / (item.bookings || 1)).toFixed(2)}`
    }));
    
    exportToCSV(revenueData, filename || 'revenue_report');
  };

  const handleExport = (exportType) => {
    switch (type) {
      case 'users':
        exportUserData();
        break;
      case 'bookings':
        exportBookingData();
        break;
      case 'cars':
        exportCarData();
        break;
      case 'revenue':
        exportRevenueData();
        break;
      case 'dashboard':
        if (exportType === 'pdf') {
          exportToPDF('dashboard-content', filename || 'dashboard_report');
        }
        break;
      default:
        exportToCSV(data, filename || 'export_data');
    }
  };

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => handleExport('csv')}
        className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        title="Export to CSV"
      >
        <Table size={16} />
        <span className="text-sm">CSV</span>
      </button>
      
      {type === 'dashboard' && (
        <button
          onClick={() => handleExport('pdf')}
          className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          title="Export to PDF"
        >
          <FileText size={16} />
          <span className="text-sm">PDF</span>
        </button>
      )}
    </div>
  );
};

export default DataExport;