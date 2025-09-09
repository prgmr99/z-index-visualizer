import { useEffect, useState } from "react";
import "./App.css";

// TypeScript를 위해 수집할 데이터의 타입을 미리 정의합니다.
interface ElementData {
  tagName: string;
  id: string;
  className: string;
  zIndex: number;
  // DOMRect는 직접 전달할 수 없으므로, 필요한 값만 가진 객체로 변환합니다.
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

function App() {
  const [elements, setElements] = useState<ElementData[]>([]);

  // 1. content-script로부터 메시지를 수신할 리스너를 설정합니다.
  useEffect(() => {
    const messageListener = (message: {
      type: string;
      payload: ElementData[];
    }) => {
      // 우리가 보낸 데이터가 맞는지 type을 확인합니다.
      if (message.type === "Z_INDEX_DATA") {
        console.log(
          "페이지로부터 z-index 데이터를 수신했습니다:",
          message.payload
        );
        setElements(message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // 컴포넌트가 사라질 때 리스너를 정리해 메모리 누수를 방지합니다.
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []); // []를 넣어 이 useEffect가 처음 한 번만 실행되도록 합니다.

  // 2. 'Analyze' 버튼 클릭 시 실행될 함수입니다.
  const handleAnalyzeClick = async () => {
    // 현재 활성화된 탭의 정보를 가져옵니다.
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab && tab.id) {
      // chrome.scripting.executeScript를 사용해 현재 탭에 함수를 주입하고 실행합니다.
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: analyzeAndCollectZIndexes, // 아래에 정의된 함수를 직접 전달합니다.
      });
    } else {
      console.error("활성화된 탭을 찾을 수 없습니다.");
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Z-Index Visualizer</h1>
        <button onClick={handleAnalyzeClick}>Analyze Current Page</button>
        <div className="results-container">
          <h3>Found {elements.length} elements with z-index.</h3>
          {/* 수집된 데이터를 JSON 형태로 예쁘게 출력합니다. */}
          <pre>{JSON.stringify(elements, null, 2)}</pre>
        </div>
      </header>
    </div>
  );
}

// 3. 웹 페이지의 컨텍스트에서 실행될 순수 함수입니다.
// 이 함수는 격리된 환경에서 실행되므로, 바깥 스코프의 변수나 함수를 사용할 수 없습니다.
function analyzeAndCollectZIndexes() {
  const elementsWithZIndex: ElementData[] = [];
  const allElements = document.querySelectorAll("*");

  allElements.forEach((element) => {
    const style = window.getComputedStyle(element);
    const zIndex = parseInt(style.zIndex, 10);

    if (!isNaN(zIndex) && zIndex > 0) {
      // z-index가 유효한 숫자인 경우
      const rect = element.getBoundingClientRect();
      elementsWithZIndex.push({
        tagName: element.tagName.toLowerCase(),
        id: element.id,
        className: element.className,
        zIndex: zIndex,
        rect: {
          // DOMRect를 순수 객체로 변환
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      });
    }
  });

  // 4. 수집이 끝나면 chrome.runtime.sendMessage를 통해 팝업으로 데이터를 전송합니다.
  chrome.runtime.sendMessage({
    type: "Z_INDEX_DATA",
    payload: elementsWithZIndex,
  });
}

export default App;
