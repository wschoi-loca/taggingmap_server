<template>
    <div v-if="filteredData.length > 0">
      <table>
        <thead>
          <tr>
            <th>SHOT_NUMBER</th>
            <th>EVENTNAME</th>
            <th>PAGEPATH</th>
            <th>PAGETITLE</th>
            <th>TIME</th>
            <th>LABEL_TEXT</th>
            <th>CONTENT_NM</th>
            <th>PAGE_MKT_CONTS_ID</th>
            <th>SUB_CONTENT_ID</th>
            <th>HORIZONTAL_INDEX</th>
            <th>VERTICAL_INDEX</th>
            <th>CATEGORY_DEPTH1</th>
            <th>CATEGORY_DEPTH2</th>
            <th>CATEGORY_DEPTH3</th>
            <th>CATEGORY_DEPTH4</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="data in filteredData" :key="data.SHOT_NUMBER">
            <td>{{ data.SHOT_NUMBER }}</td>
            <td>{{ data.EVENTNAME }}</td>
            <td>{{ data.PAGEPATH }}</td>
            <td>{{ data.PAGETITLE }}</td>
            <td>{{ data.TIME }}</td>
            <td>{{ data.LABEL_TEXT }}</td>
            <td>{{ data.CONTENT_NM }}</td>
            <td>{{ data.PAGE_MKT_CONTS_ID }}</td>
            <td>{{ data.SUB_CONTENT_ID }}</td>
            <td>{{ data.HORIZONTAL_INDEX }}</td>
            <td>{{ data.VERTICAL_INDEX }}</td>
            <td>{{ data.CATEGORY_DEPTH1 }}</td>
            <td>{{ data.CATEGORY_DEPTH2 }}</td>
            <td>{{ data.CATEGORY_DEPTH3 }}</td>
            <td>{{ data.CATEGORY_DEPTH4 }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else>
      <p>No data available for the selected criteria.</p>
    </div>
  </template>
  
  <script>
  export default {
    name: 'TaggingMapTable',
    props: {
      filteredData: Array
    }
  };
  </script>
  
  <style scoped>
  table {
    border-collapse: collapse;
    width: 100%;
  }
  
  th, td {
    border: 1px solid #ccc;
    padding: 10px;
    text-align: left;
  }
  </style>