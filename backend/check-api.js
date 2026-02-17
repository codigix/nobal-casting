
import axios from 'axios';

async function checkApi() {
  try {
    const response = await axios.get('http://localhost:5001/api/oee/dashboard', {
      params: {
        startDate: '2026-02-15',
        endDate: '2026-02-15'
      }
    });
    console.log('API Status:', response.data.success);
    console.log('MachineOEE length:', response.data.data.machineOEE.length);
    console.log('DowntimeReasons length:', response.data.data.downtimeReasons.length);
    if (response.data.data.machineOEE.length > 0) {
      console.log('First machine entry:', JSON.stringify(response.data.data.machineOEE[0], null, 2));
    }
  } catch (err) {
    console.error('API Error:', err);
    if (err.response) {
      console.log('Response status:', err.response.status);
      console.log('Response data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

checkApi();
