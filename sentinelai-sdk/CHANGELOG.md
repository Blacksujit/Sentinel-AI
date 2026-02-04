# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial SDK implementation
- Render backend integration
- Comprehensive test suite
- CI/CD pipeline
- Semantic versioning strategy

## [1.0.0] - 2024-02-05

### Added
- **SentinelAIClient** - Main API client for SentinelAI integration
- **ConversationTracker** - Multi-turn conversation tracking and analysis
- **Risk Assessment** - Real-time AI safety analysis with risk scores
- **Decision Making** - Allow/warn/block/escalate decisions based on thresholds
- **Error Handling** - Comprehensive exception handling and retry logic
- **Health Checks** - Backend health monitoring and status checking
- **Logging Integration** - Full audit trail and risk log retrieval
- **Production Features**:
  - Automatic retries with exponential backoff
  - Configurable timeouts and retry policies
  - Environment variable configuration
  - API key authentication

### Features
- **Real-time Analysis**: Analyze prompt/response pairs instantly
- **Risk Scoring**: Get detailed risk scores (0.0 to 1.0)
- **Multi-turn Support**: Track entire conversations
- **Backend Integration**: Seamless integration with Render backend
- **Developer Friendly**: Simple 3-line integration
- **Production Ready**: Built-in retries, timeouts, and error handling

### API Endpoints
- `POST /api/analyze` - Analyze interactions for safety
- `GET /api/health` - Check backend health status
- `GET /api/logs` - Retrieve risk analysis logs
- `GET /api/settings` - Get current safety settings
- `POST /api/settings/reset` - Reset settings to defaults

### Documentation
- Comprehensive README with examples
- API endpoint documentation
- Integration examples for common use cases
- Error handling guide

### Testing
- Unit tests with 80%+ coverage
- Integration tests with mock backend
- Exception handling tests
- Conversation tracking tests

### Development
- pytest configuration
- CI/CD pipeline with GitHub Actions
- Automated testing on Python 3.8-3.12
- Code quality checks (flake8, black, isort)
- Automated PyPI publishing on releases

### Security
- API key authentication support
- Secure credential handling
- Error message sanitization
- Request/response validation

---

## Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

### MAJOR (X.0.0)
- Breaking changes that require user action
- Removal of deprecated features
- Major architectural changes
- Changes to public API contracts

### MINOR (X.Y.0)
- New features added to existing functionality
- Backward-compatible enhancements
- New API endpoints or methods
- Additional configuration options

### PATCH (X.Y.Z)
- Bug fixes that don't change functionality
- Security updates
- Documentation improvements
- Performance optimizations
- Typos and formatting fixes

### Release Process
1. **Development**: Features developed on `develop` branch
2. **Testing**: Automated tests pass on all Python versions
3. **Release**: Create GitHub release with semantic version
4. **Publish**: Automatically published to PyPI
5. **Documentation**: Changelog updated with all changes

### Example Version Changes
- `1.0.0` → `1.1.0`: Add new `client.get_settings()` method
- `1.1.0` → `1.1.1`: Fix bug in retry logic
- `1.1.1` → `2.0.0`: Change `client.analyze()` parameter structure

---

## Supported Python Versions

- Python 3.8+
- Tested on 3.8, 3.9, 3.10, 3.11, 3.12

## Dependencies

- `requests>=2.25.0` - HTTP client library

## License

MIT License - see LICENSE file for details.
