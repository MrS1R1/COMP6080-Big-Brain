import { Button, Card, message, Layout, Dropdown, Avatar, Space, Row, Col, Typography, Empty, Modal, Form, Input, Upload, Popconfirm, Tag, Radio } from 'antd';
import { Link, useNavigate } from 'react-router';
import { isLogin } from '../../utils';
import { useEffect, useState } from 'react';
import { UserOutlined, LogoutOutlined, PlusOutlined, UploadOutlined, DeleteOutlined, PlayCircleOutlined, CopyOutlined, StopOutlined } from '@ant-design/icons';
import http from '../../utils/request';
const { Header } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const getUserEmail = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

function App() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSessionModalVisible, setIsSessionModalVisible] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [games, setGames] = useState([]);
  const [thumbnail, setThumbnail] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [creationType, setCreationType] = useState('form');

  useEffect(()=>{
    const logined = isLogin();
    if(!logined){
      message.warning('Please login',0.5,() =>{
        navigate('/login');
      });
    } else {
      fetchGames();
    }
  }, []);

  const fetchGames = async () => {
    try {
      const response = await http.get('/admin/games');
      if (response && response.games) {
        setGames(response.games);
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
      message.error('Failed to load games');
    }
  };

  const handleLogout = () => {
    http.post('/admin/auth/logout')
    .then(res => {
      if (res) {
        localStorage.removeItem('token');
        message.success('Logout successful');
        navigate('/login');
      }
    })
  };

  const userMenu = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0min 0sec';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}min ${remainingSeconds}sec`;
  };

  const calculateTotalDuration = (game) => {
    if (!game.questions || !Array.isArray(game.questions)) return 0;
    return game.questions.reduce((total, question) => total + (question.time || 0), 0);
  };

  const getQuestionCount = (game) => {
    return game.questions ? game.questions.length : 0;
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const normFile = (e) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  const handleUploadChange = async (info) => {
    const file = info.fileList[0]?.originFileObj;
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setThumbnail(reader.result);
      };
    }
  };

  const handleCreateGame = async(values) => {
    let gameName = '';
    let gameThumbnail = '';
    let gameQuestions = [];

    if (creationType === 'json' && values.jsonFile) {
      try {
        const file = values.jsonFile[0].originFileObj;
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const jsonContent = JSON.parse(e.target.result);
            
            // 验证JSON格式
            if (!jsonContent.name) {
              throw new Error('Invalid JSON format: game name is required');
            }
            if (!Array.isArray(jsonContent.questions)) {
              throw new Error('Invalid JSON format: questions must be an array');
            }
            
            // 验证每个问题的格式
            jsonContent.questions.forEach((question, index) => {
              if (!question.title) {
                throw new Error(`Invalid question format at index ${index}: title is required`);
              }
              if (!question.type) {
                throw new Error(`Invalid question format at index ${index}: type is required`);
              }
              if (!question.time) {
                throw new Error(`Invalid question format at index ${index}: time is required`);
              }
              if (!question.options || !Array.isArray(question.options)) {
                throw new Error(`Invalid question format at index ${index}: options must be an array`);
              }
              
              // 处理正确答案
              const correctAnswers = question.options
                .filter(option => option.isCorrect)
                .map(option => option.text);
              
              if (correctAnswers.length === 0) {
                throw new Error(`Invalid question format at index ${index}: at least one correct answer is required`);
              }
              
              // 转换问题格式以匹配后端要求
              question.correctAnswers = correctAnswers;
              question.duration = question.time;
              question.answers = question.options.map(option => ({
                answer: option.text
              }));
            });
            
            // 使用JSON中的游戏名称和问题
            gameName = jsonContent.name;
            gameQuestions = jsonContent.questions;
            
            // 使用JSON中的缩略图（如果存在）
            if (jsonContent.thumbnail) {
              gameThumbnail = jsonContent.thumbnail;
            }
          } catch (error) {
            message.error(error.message || 'Invalid JSON file format');
            return;
          }
        };
        reader.readAsText(file);
      } catch (error) {
        message.error('Failed to read JSON file');
        return;
      }
    } else {
      // 表单创建模式
      if (!values.title) {
        message.error('Please input game name');
        return;
      }
      gameName = values.title;
      gameThumbnail = thumbnail;
    }

    const newGame = {
      id: Date.now().toString(),
      name: gameName,
      owner: getUserEmail(),
      thumbnail: gameThumbnail || '',
      questions: gameQuestions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data = {
      games: [...games, newGame]
    };

    try {
      const response = await http.put('/admin/games', data);
      if (response) {
        message.success('Game created successfully');
        fetchGames();
        setIsModalVisible(false);
        form.resetFields();
        setThumbnail('');
        setCreationType('form');
      }
    } catch (error) {
      console.error('Failed to create game:', error);
      message.error('Failed to create game');
    }
  };

  const handleDeleteGame = async (gameId) => {
    try {
      const filteredGames = games.filter(game => game.id !== gameId);
      const data = {
        games: filteredGames
      };
      
      const response = await http.put('/admin/games', data);
      if (response) {
        message.success('Game deleted successfully');
        fetchGames();
      }
    } catch (error) {
      console.error('Failed to delete game:', error);
      message.error('Failed to delete game');
    }
  };

  const handleStartGame = async (game) => {
    try {
      // Call backend API to start game
      const response = await http.post(`/admin/game/${game.id}/mutate`, {
        mutationType: 'START'
      });

      if (response.data && response.data.sessionId) {
        setCurrentGame(game);
        setSessionId(response.data.sessionId);
        setActiveSession({
          gameId: game.id,
          sessionId: response.data.sessionId,
          startTime: new Date().toISOString()
        });
        setIsSessionModalVisible(true);

        // Generate game link
        const gameUrl = `${window.location.origin}/play/${response.data.sessionId}`;
        message.success(
          <span>
            Game started successfully!
            <br />
            Game link:
            <a href={gameUrl} target="_blank" rel="noopener noreferrer">
              {gameUrl}
            </a>
          </span>
        );
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      message.error('Failed to start game');
    }
  };

  const handleStopGame = async (game) => {
    // Ensure we have a valid session ID
    if (!activeSession || !activeSession.sessionId) {
      message.error('Unable to get session information');
      return;
    }

    Modal.confirm({
      title: 'End Game',
      content: 'The game is about to end. Would you like to view the results or return to the dashboard?',
      okText: 'View Results',
      cancelText: 'Return to Dashboard',
      onOk: async () => {
        try {
          // Call backend API to end game
          await http.post(`/admin/game/${game.id}/mutate`, {
            mutationType: 'END'
          });

          // Wait a short time to ensure session status is updated
          await new Promise(resolve => setTimeout(resolve, 500));

          // Verify using sessionId from activeSession
          const statusResponse = await http.get(`/admin/session/${activeSession.sessionId}/status`);
          if (!statusResponse.results.active) {
            setActiveSession(null);
            // Navigate to results page
            navigate(`/session/${activeSession.sessionId}`);
          } else {
            message.error('Failed to end game, please try again');
          }
        } catch (error) {
          console.error('Failed to end game:', error);
          message.error('Operation failed, please try again');
        }
      },
      onCancel: async () => {
        try {
          // Call backend API to end game
          await http.post(`/admin/game/${game.id}/mutate`, {
            mutationType: 'END'
          });

          // Wait a short time to ensure session status is updated
          await new Promise(resolve => setTimeout(resolve, 500));

          // Verify using sessionId from activeSession
          const statusResponse = await http.get(`/admin/session/${activeSession.sessionId}/status`);
          if (!statusResponse.results.active) {
            setActiveSession(null);
            // Refresh game list
            fetchGames();
          } else {
            message.error('Failed to end game, please try again');
          }
        } catch (error) {
          console.error('Failed to end game:', error);
          message.error('Operation failed, please try again');
        }
      },
      closable: true,
      maskClosable: false
    });
  };

  const handleCopyLink = () => {
    const gameLink = `${window.location.origin}/play/${sessionId}`;
    navigator.clipboard.writeText(gameLink).then(() => {
      message.success('Game link copied to clipboard');
    }).catch(() => {
      message.error('Copy failed, please manually copy the link');
    });
  };

  const handleCloseSessionModal = () => {
    setIsSessionModalVisible(false);
    setCurrentGame(null);
    setSessionId('');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: '#fff',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>BigBrain</Title>
          <Text type="secondary">Interactive Quiz Platform</Text>
        </div>
        <Space>
          <Text>{getUserEmail()}</Text>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
          </Dropdown>
        </Space>
      </Header>
      <div style={{ 
        padding: '24px',
        background: '#f0f2f5',
        minHeight: 'calc(100vh - 64px)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          padding: '24px',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            marginBottom: '24px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingBottom: '16px',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <Title level={2} style={{ margin: 0 }}>Games</Title>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={showModal}
              size="large"
            >
              Create New Game
            </Button>
          </div>
          {games.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  No games available. Create your first game to get started!
                </span>
              }
              style={{ padding: '48px 0' }}
            />
          ) : (
            <Row gutter={[24, 24]}>
              {games.map(game => (
                <Col xs={24} sm={12} md={8} lg={6} key={game.id}>
                  <Card
                    hoverable
                    cover={game.thumbnail ? (
                      <img 
                        alt={game.name} 
                        src={game.thumbnail} 
                        style={{ 
                          height: 200, 
                          objectFit: 'cover',
                          borderTopLeftRadius: '8px',
                          borderTopRightRadius: '8px'
                        }} 
                      />
                    ) : (
                      <div style={{ 
                        height: 200, 
                        background: '#f0f0f0', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px'
                      }}>
                        <Text type="secondary">No thumbnail</Text>
                      </div>
                    )}
                    actions={[
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '8px',
                        width: '100%',
                        padding: '0 16px'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          width: '100%'
                        }}>
                          {activeSession && activeSession.gameId === game.id ? (
                            <Button
                              type="primary"
                              danger
                              key="stop"
                              icon={<StopOutlined />}
                              onClick={() => handleStopGame(game)}
                              style={{ width: '48%' }}
                            >
                              Stop Game
                            </Button>
                          ) : (
                            <Button
                              type="primary"
                              key="start"
                              icon={<PlayCircleOutlined />}
                              onClick={() => handleStartGame(game)}
                              disabled={activeSession !== null}
                              style={{ width: '48%' }}
                            >
                              Start Game
                            </Button>
                          )}
                          <Popconfirm
                            title="Delete Game"
                            description="Are you sure you want to delete this game?"
                            onConfirm={() => handleDeleteGame(game.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button 
                              type="text" 
                              danger 
                              icon={<DeleteOutlined />}
                              style={{ width: '48%' }}
                            >
                              Delete
                            </Button>
                          </Popconfirm>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          width: '100%'
                        }}>
                          <Button 
                            type="primary" 
                            key="edit" 
                            onClick={() => navigate(`/game/${game.id}`)}
                            style={{ width: '48%' }}
                          >
                            Edit
                          </Button>
                          <Button 
                            type="primary" 
                            key="manage" 
                            onClick={() => navigate(`/game-management/${game.id}`)}
                            style={{ width: '48%' }}
                          >
                            Manage
                          </Button>
                        </div>
                      </div>
                    ]}
                    style={{ 
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <Card.Meta
                      title={game.name}
                      description={
                        <div>
                          <Space direction="vertical" size="small">
                            <Text>Questions: {getQuestionCount(game)}</Text>
                            <Text>Total Duration: {formatDuration(calculateTotalDuration(game))}</Text>
                            {activeSession && activeSession.gameId === game.id && (
                              <Tag color="success">Game in Progress</Tag>
                            )}
                          </Space>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </div>

      <Modal
        title="Create New Game"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateGame}
        >
          <Form.Item
            name="creationType"
            label="Creation Method"
            initialValue="form"
          >
            <Radio.Group onChange={(e) => setCreationType(e.target.value)}>
              <Radio value="form">Form Creation</Radio>
              <Radio value="json">JSON Import</Radio>
            </Radio.Group>
          </Form.Item>

          {creationType === 'form' ? (
            <>
              <Form.Item
                name="title"
                label="Game Name"
                rules={[{ required: true, message: 'Please input the game name!' }]}
              >
                <Input placeholder="Enter game name" size="large" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
              >
                <TextArea rows={4} placeholder="Enter game description (optional)" />
              </Form.Item>

              <Form.Item
                name="thumbnail"
                label="Thumbnail"
                valuePropName="fileList"
                getValueFromEvent={normFile}
              >
                <Upload
                  name="thumbnail"
                  listType="picture-card"
                  maxCount={1}
                  beforeUpload={() => false}
                  onChange={handleUploadChange}
                >
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>Upload</div>
                  </div>
                </Upload>
              </Form.Item>
            </>
          ) : (
            <Form.Item
              name="jsonFile"
              label="JSON File"
              valuePropName="fileList"
              getValueFromEvent={normFile}
              rules={[{ required: true, message: 'Please upload a JSON file!' }]}
            >
              <Upload
                name="jsonFile"
                accept=".json"
                maxCount={1}
                beforeUpload={() => false}
              >
                <Button icon={<UploadOutlined />}>Click to upload</Button>
              </Upload>
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: '8px' }}>
              Create
            </Button>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Game Session"
        open={isSessionModalVisible}
        onCancel={handleCloseSessionModal}
        footer={[
          <Button key="close" onClick={handleCloseSessionModal}>
            Close
          </Button>
        ]}
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong>Game Name: </Text>
          <Text>{currentGame?.name}</Text>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <Text strong>Session ID: </Text>
          <Text>{sessionId}</Text>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <Text strong>Game Link: </Text>
          <Space>
            <a href={`${window.location.origin}/play/${sessionId}`} target="_blank" rel="noopener noreferrer">
              {`${window.location.origin}/play/${sessionId}`}
            </a>
            <Button 
              type="primary" 
              icon={<CopyOutlined />} 
              onClick={handleCopyLink}
            >
              Copy Link
            </Button>
          </Space>
        </div>
      </Modal>
    </Layout>
  )
}

export default App
