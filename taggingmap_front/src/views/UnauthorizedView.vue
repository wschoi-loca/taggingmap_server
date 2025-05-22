<template>
    <div class="unauthorized">
      <div class="error-container">
        <h1>403</h1>
        <h2>접근 권한이 없습니다</h2>
        <p>이 페이지에 접근하려면 관리자 권한이 필요합니다.</p>
        <router-link to="/" class="home-link">홈으로 돌아가기</router-link>
      </div>
    </div>
  </template>
  
  <style scoped>
  .unauthorized {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    text-align: center;
  }
  
  .error-container {
    max-width: 500px;
    padding: 40px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  h1 {
    font-size: 72px;
    margin: 0;
    color: #dc3545;
  }
  
  h2 {
    margin: 10px 0 20px;
    color: #333;
  }
  
  p {
    color: #666;
    margin-bottom: 30px;
  }
  
  .home-link {
    display: inline-block;
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .home-link:hover {
    background-color: #0056b3;
  }
  </style>