import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error)
    };
  }

  componentDidCatch(error) {
    console.error("App render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app app-error">
          <div className="error-shell">
            <h1>화면 렌더링 오류가 발생했습니다.</h1>
            <p>아래 메시지를 확인한 뒤 알려주시면 바로 이어서 고치겠습니다.</p>
            <pre>{this.state.message}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
