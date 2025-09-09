/**
 * 이 스크립트는 분석이 필요할 때마다 웹 페이지에 직접 주입됩니다.
 * 페이지 내에서 z-index를 가진 모든 요소를 찾아 그 정보를 팝업으로 전송하는 역할을 합니다.
 */
(() => {
  console.log("Z-Index Visualizer: Content script injected and running.");

  const elementsWithZIndex = [];
  const allElements = document.querySelectorAll("*");

  allElements.forEach((element) => {
    const style = window.getComputedStyle(element);
    const zIndex = parseInt(style.zIndex, 10);

    // z-index가 유효한 숫자이고, position이 'static'이 아닌 경우에만 수집합니다.
    // (z-index는 position이 static이 아닐 때만 의미가 있습니다.)
    if (!isNaN(zIndex) && style.position !== "static") {
      const rect = element.getBoundingClientRect();

      // 화면에 실제로 보이는 요소(너비와 높이가 0보다 큰)만 수집합니다.
      if (rect.width > 0 && rect.height > 0) {
        elementsWithZIndex.push({
          tagName: element.tagName.toLowerCase(),
          id: element.id,
          className: element.className,
          zIndex: zIndex,
          // getBoundingClientRect 결과는 직렬화가 안되므로 필요한 값만 추출합니다.
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        });
      }
    }
  });

  // 수집된 데이터를 'Z_INDEX_DATA'라는 타입의 메시지로 팝업에 전송합니다.
  chrome.runtime.sendMessage({
    type: "Z_INDEX_DATA",
    payload: elementsWithZIndex,
  });
})();
