import * as React from 'react';

function useHandleStreamResponse({ onChunk, onFinish, onError }) {
  const handleStreamResponse = React.useCallback(
    async (response) => {
      if (response.body) {
        const reader = response.body.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let content = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                onFinish(content);
                break;
              }
              const chunk = decoder.decode(value, { stream: true });
              content += chunk;
              onChunk(content);
            }
          } catch (streamError) {
            // Handle network errors mid-stream gracefully
            console.error('[useHandleStreamResponse] Stream error:', streamError);
            if (onError) {
              onError(streamError);
            } else {
              // If no error handler, still call onFinish with whatever we got
              onFinish(content);
            }
          }
        }
      }
    },
    [onChunk, onFinish, onError],
  );
  const handleStreamResponseRef = React.useRef(handleStreamResponse);
  React.useEffect(() => {
    handleStreamResponseRef.current = handleStreamResponse;
  }, [handleStreamResponse]);
  return React.useCallback(
    (response) => handleStreamResponseRef.current(response),
    [],
  );
}

export default useHandleStreamResponse;
