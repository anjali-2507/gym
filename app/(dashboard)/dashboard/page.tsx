'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaCalendarAlt } from 'react-icons/fa'; 
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import DatePicker from 'react-datepicker'; 
import 'react-datepicker/dist/react-datepicker.css'; 
import { saveAs } from 'file-saver'; // For downloading files
import jsPDF from 'jspdf'; // For generating PDFs
import 'jspdf-autotable'; // For table support in PDF
import * as XLSX from 'xlsx'; // For generating Excel files

interface Meeting {
  _id: string;
  clientName: string;
  clientNumber: string;
  date: string;
  time: string;
  status: string;
  markDate: string;
  statusTime: string;
  TotalTime: string;
  studentResponseTime?: string; // The time when the student clicked Yes/No

}

const GymDashboard = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for controlling the dropdown visibility
  const dropdownRef = useRef<HTMLDivElement>(null); // Reference for dropdown

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await fetch('/api/Gym_Management');
        const data = await response.json();
        if (data.success && data.data) {
          setMeetings(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  // Close dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const timeToDate = (time: string) => {
    const today = new Date();
    const [hours, minutesWithPeriod] = time.split(':');
    const [minutes, period] = minutesWithPeriod.split(' ');
    let hour = parseInt(hours, 10);
    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    const formattedTime = `${today.toLocaleDateString()} ${hour}:${minutes}:00`;
    const formattedDate = new Date(formattedTime);
    return isNaN(formattedDate.getTime()) ? new Date() : formattedDate;
  };

  const normalizeNumber = (num: any) => String(num || '').replace(/\D/g, '');

  const searchData = (data: Meeting[], term: string, dateRange: [Date | null, Date | null]) => {
    const [startDate, endDate] = dateRange;
    const searchValue = term.toLowerCase().trim();

    return data.filter((meeting) => {
      const clientName = (meeting.clientName || '').toLowerCase().trim();
      const clientNumber = normalizeNumber(meeting.clientNumber || '');

      const isSearchMatch =
        clientName.includes(searchValue) || clientNumber.includes(searchValue);

      const meetingDate = new Date(meeting.date);

      const isDateMatch =
        startDate && endDate
          ? meetingDate >= startDate && meetingDate <= endDate
          : startDate
          ? meetingDate.toDateString() === startDate.toDateString()
          : true;

      return isSearchMatch && isDateMatch;
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleDateChange = (update: [Date | null, Date | null]) => {
    setDateRange(update);
  };

  const calculateTotalTime = (meeting: Meeting) => {
    if (!meeting.time || !meeting.statusTime) return 'N/A';
    try {
      const startTime = timeToDate(meeting.time);
      const endTime = timeToDate(meeting.statusTime);
      const diffMs = endTime.getTime() - startTime.getTime();
      if (diffMs < 0) return 'N/A';
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
    } catch {
      return 'N/A';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'yes':
        return 'bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100';
      case 'no':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'Pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const filteredMeetings = searchData(meetings, searchTerm, dateRange);



  const handleClearFilters = () => {
    setSearchTerm('');
    setDateRange([null, null]);
  };


  const isFilterActive = !!searchTerm || !!dateRange[0] || !!dateRange[1];
  
  


 
    // Function to determine if the status should be green
    const getStatusStyle = (meeting: Meeting) => {
      const dateObject = new Date(meeting.date);
      const [hours, minutes, period] = meeting.time.split(/[: ]/);
      let timeObject = new Date(dateObject);
    
      // Convert the time into 24-hour format
      let hours24 = parseInt(hours, 10);
      if (period === "pm" && hours24 !== 12) {
        hours24 += 12;
      } else if (period === "am" && hours24 === 12) {
        hours24 = 0;
      }
    
      timeObject.setHours(hours24, parseInt(minutes, 10), 0, 0);
    
      const markDateObject = new Date(meeting.markDate);
      const studentResponseTime = meeting.studentResponseTime ? new Date(meeting.studentResponseTime) : null;
    
      // Calculate the time difference in hours
      const timeDiff = (markDateObject.getTime() - timeObject.getTime()) / (1000 * 60 * 60);
      const isBeforeTrainingTime = timeDiff <= 12;
    
      if (!studentResponseTime) {
        return {}; // No response yet, return default style (Pending)
      }
    
      // New logic for status styling
      switch (meeting.status?.toLowerCase()) {
        case 'yes':
          // Green if the response is before 12 hours of the meeting time
          return isBeforeTrainingTime
            ? 'bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100';
    
        case 'no':
          // Green if the response is before 12 hours of the meeting time
          // Or if the response is changed to No after the 12-hour mark
          return isBeforeTrainingTime || timeDiff > 12
            ? 'bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100'
            : 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
    
        case 'pending':
          return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
    
        default:
          return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      }
    };
    
    const exportToPDF = () => {
    const doc = new jsPDF();
    const tableData = filteredMeetings.map((meeting) => [
      meeting.clientName,
      meeting.clientNumber,
      formatDate(meeting.date),
      meeting.time,
      meeting.status,
      formatDate(meeting.markDate),
      meeting.statusTime,
      meeting.TotalTime,
    ]);

    doc.text('Gym Attendance Report', 14, 10);
    doc.autoTable({
      head: [['Client Name', 'Client Number', 'Date', 'Time', 'Status','Status Time', 'Total Time']],
      body: tableData,
      startY: 20, // Optional: Adjust starting Y position for the table
    });
    doc.save('Gym_Attendance_Report.pdf');
  };

  const exportToExcel = () => {
    const excelData = filteredMeetings.map((meeting) => ({
      'Client Name': meeting.clientName || 'N/A',
      'Client Number': meeting.clientNumber || 'N/A',
      Date: formatDate(meeting.date) || 'N/A',
      Time: meeting.time || 'N/A',
      Status: meeting.status || 'N/A',
      'Status Time': meeting.statusTime || 'N/A',
      'Total Time': meeting.TotalTime || 'N/A',
    }));
  
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gym_Attendance');
    XLSX.writeFile(workbook, 'Gym_Attendance_Report.xlsx');
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-800 dark:text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen bg-white p-4 dark:bg-gray-900">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          GYM Attendance Report Data
        </h1>

        {/* Export Button with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Export
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md z-10">
              <button
                onClick={exportToPDF}
                className="block w-full px-4 py-2 text-gray-800 hover:bg-gray-200 text-left"
              >
                Export to PDF
              </button>
              <button
                onClick={exportToExcel}
                className="block w-full px-4 py-2 text-gray-800 hover:bg-gray-200 text-left"
              >
                Export to Excel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative w-full max-w-md">
          <Input
            type="text"
            placeholder="Search by client name or number..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-10"
          />
          <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
        </div>

        <div className="relative">
          <DatePicker
            selectsRange={true}
            onChange={(update) => handleDateChange(update)}
            isClearable={true}
            placeholderText="Select date or date range"
            className="w-full rounded-md border px-3 py-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-white"
            dateFormat="dd/MM/yyyy"
          />
          <FaCalendarAlt className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
        </div>

        {isFilterActive && (
          <button
            onClick={handleClearFilters}
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            Clear Filters
          </button>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-230px)] overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead>
              <tr className="sticky top-0 bg-gray-100 px-4 py-3 text-center font-semibold text-gray-700 dark:bg-gray-700 dark:text-white">
                <th>Client Name</th>
                <th>Client Number</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Status Time</th>
                <th>Total Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
  {filteredMeetings.map((meeting) => (
    <tr
      key={meeting._id}
      className="hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <td className="px-4 py-3 text-center text-gray-800 dark:text-white">
        {meeting.clientName || 'N/A'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center text-gray-800 dark:text-white">
        {meeting.clientNumber || 'N/A'}
      </td>
      <td className="px-4 py-3 text-center text-gray-800 dark:text-white">
        {meeting.date ? formatDate(meeting.date) : 'N/A'}
      </td>
      <td className="px-4 py-3 text-center text-gray-800 dark:text-white">
        {meeting.time || 'N/A'}
      </td>
      <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                        meeting.status
                      )}`}
                    >

                      
                      {meeting.status || 'N/A'}
                    </span>
                  </td>

      <td className="px-4 py-3 text-center text-gray-800 dark:text-white">
        {meeting.statusTime || 'N/A'}
      </td>
      <td className="px-4 py-3 text-center text-gray-800 dark:text-white">
        {meeting.TotalTime || calculateTotalTime(meeting)}
      </td>
    </tr>
  ))}
</tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
};

export default GymDashboard;
